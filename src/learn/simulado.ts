// Simulados: lei seca (5 alternativas), Certo/Errado (estilo CEBRASPE) e casos (estilo FGV).
import type { Article, LawDoc, Unit } from '../core/types';
import { coverage, ensureLaws, getArticle } from '../data/corpus';
import { db, DIMS, kvGet, type Dim } from '../data/db';
import { canTrainArticle, unitContext, unitPath, type Exercise } from './generators';
import { buildCasePena } from './cases';
import { CASE_BANK } from '../content/lawCases';
import { questionTargets } from './lawQuestions';
import type { Mutation } from './mutations';
import { scopeArticles, scopeLaws, conceptExercise, conceptInScope, type SessionConfig } from './session';
import { areaLaws, EDITAL_TJMS, type AreaId } from '../core/areas';
import { EDITAL } from '../core/sources';
import { topicoLabel } from './plan';
import { loadCalibration, recordAnswer } from './scheduler';
import { fold, hashStr, rng, shuffle } from './text';

export type Estilo = 'leiseca' | 'cebraspe' | 'fgv';
export interface SimOption { id: string; text: string; correct: boolean; why?: string }
export interface Questao {
  id: string; estilo: Estilo; lawId?: string; articleId?: string; unitId?: string; conceptId?: string;
  where?: string; enunciado: string; contexto?: string; contextoLegal?: string; texto?: string;
  disciplina?: string; bloco?: string;
  options?: SimOption[]; ce?: 'C' | 'E'; mutation?: Mutation; officialText?: string; target?: string; dim?: Dim;
}
export interface Simulado {
  id: string; estilo: Estilo; area?: AreaId; edital?: 'tjsp' | 'tjms'; n: number; tempoMin: number | null; createdAt: number; title: string;
  position?: number; questoes: Questao[]; respostas: Record<string, string>; finishedAt?: number; startedAt: number;
}

export const EDITAL_SIMULADO = {
  tjsp: {
    title: 'TJSP · Conhecimentos em Direito',
    detail: '30 de Direito. Português, conhecimentos gerais e redação ficam fora deste treino.',
    url: EDITAL.url,
    blocks: [{ id: 'II', label: 'Conhecimentos em Direito', n: 30, minimum: 15 }],
  },
  tjms: {
    title: 'TJMS · Blocos jurídicos',
    detail: '5 de Noções de Legislação e 40 de Conhecimentos Específicos. Português e conteúdos sem banco próprio ficam fora.',
    url: EDITAL_TJMS.url,
    blocks: [
      { id: 'Conhecimentos Básicos', label: 'Noções de Legislação', n: 5, minimum: null },
      { id: 'Conhecimentos Específicos', label: 'Conhecimentos Específicos', n: 40, minimum: 20 },
    ],
  },
} as const;

export const editalQuestionCount = (area: 'tjsp' | 'tjms') => EDITAL_SIMULADO[area].blocks.reduce((total, block) => total + block.n, 0);

const L = 'ABCDE';

const substantiveContrasts = new Set([
  'vedado', 'vedada', 'vedados', 'vedadas', 'permitido', 'permitida', 'permitidos', 'permitidas',
  'maioria absoluta', 'maioria simples', 'unanimidade', 'dias uteis', 'dias corridos',
  'exclusivamente', 'preferencialmente', 'obrigatoriamente', 'facultativamente',
  'cumulativamente', 'alternativamente', 'superior', 'inferior', 'superiores', 'inferiores',
  'dolo', 'culpa', 'doloso', 'culposo', 'dolosa', 'culposa', 'citacao', 'intimacao',
  'tutela antecipada', 'tutela cautelar', 'tutela da evidencia', 'agravo de instrumento', 'agravo interno',
]);

function alternativesForRule(law: LawDoc, unit: Unit, seed: string, meaningOnly = false): Mutation[] {
  const r = rng(seed);
  return shuffle(questionTargets(law, unit), r)
    .filter(({ target }) => !meaningOnly || target.amount || target.kind === 'excecao' || substantiveContrasts.has(fold(target.text)))
    .sort((a, b) => (b.target.priority ?? 0) - (a.target.priority ?? 0))
    .flatMap(({ target, choices }) => choices.slice(0, 4).map((to) => ({
      text: unit.t.slice(0, target.start) + to + unit.t.slice(target.start + target.text.length),
      from: target.text, to, dim: target.dim, kind: 'sentido',
      note: `A redação oficial usa “${target.text}” neste ponto.`,
    })));
}

function qLeiSeca(law: LawDoc, art: Article, u: Unit, seed: string): Questao | null {
  const r = rng(seed);
  const where = `${law.short}, ${unitPath(art, u)}`;
  const base = { estilo: 'leiseca' as const, lawId: law.id, articleId: art.id, unitId: u.id, where, officialText: u.t,
    contextoLegal: unitContext(art, u).map(({ t }) => t).join('').trim() || undefined };
  const candidates = questionTargets(law, u).sort((a, b) => (b.target.priority ?? 0) - (a.target.priority ?? 0));
  const primary = candidates.find(({ target, choices }) => target.amount && choices.length >= 4) ?? candidates.find(({ choices }) => choices.length >= 4);
  if (primary) {
    const { target, choices } = primary;
    const texto = u.t.slice(0, target.start) + '________' + u.t.slice(target.start + target.text.length);
    const options = shuffle([
      { id: 'ok', text: target.text, correct: true, why: 'É a redação do dispositivo.' },
      ...choices.slice(0, 4).map((text, i) => ({ id: `d${i}`, text, correct: false })),
    ], r);
    return { ...base, id: `S:${u.id}:B:${target.dim}`, enunciado: 'Qual alternativa completa a regra legal?', texto, options, target: target.text, dim: target.dim };
  }
  const changes = [...new Map(alternativesForRule(law, u, seed).map((change) => [change.text, change])).values()];
  if (changes.length < 4 || u.t.length > 360) return null;
  const wrong = changes.slice(0, 4).map((change, i) => ({ id: `m${i}`, text: change.text, correct: false, why: change.note }));
  const options = shuffle([{ id: 'ok', text: u.t, correct: true, why: 'Corresponde à regra legal.' }, ...wrong], r);
  return { ...base, id: `S:${u.id}:A`, enunciado: 'Qual alternativa expressa a regra do dispositivo?', options };
}

function qCebraspe(law: LawDoc, art: Article, u: Unit, seed: string): Questao | null {
  const r = rng(seed);
  const changes = alternativesForRule(law, u, seed, true);
  const change = changes[0];
  if (!change) return null;
  const changed = r() < 0.5;
  return { id: `S:${u.id}:CE`, estilo: 'cebraspe', lawId: law.id, articleId: art.id, unitId: u.id,
    where: `${law.short}, ${unitPath(art, u)}`,
    enunciado: 'Julgue a afirmação à luz do dispositivo indicado.', texto: changed ? change.text : u.t, ce: changed ? 'E' : 'C',
    contextoLegal: unitContext(art, u).map(({ t }) => t).join('').trim() || undefined,
    mutation: changed ? change : undefined, officialText: u.t, target: change.from, dim: change.dim,
  };
}

async function collectQuestions(cfg: SessionConfig, estilo: Estilo, n: number, seed: number, excluded = new Set<string>(), fiveChoices = false) {
  const r = rng(seed);
  const arts = await scopeArticles({ ...cfg, order: 'misturado' }, seed);
  const qs: Questao[] = [];
  const usedArt = new Map<string, number>();
  const used = new Set(excluded);
  const add = (question: Questao) => {
    if (used.has(question.id) || (fiveChoices && question.options?.length !== 5)) return false;
    used.add(question.id);
    qs.push(question);
    return true;
  };
  if (estilo === 'fgv') {
    const laws = new Set(scopeLaws(cfg));
    const scopedArticles = new Set(arts);
    for (const c of shuffle(CASE_BANK.filter((c) => conceptInScope(c, cfg, laws, scopedArticles)), r)) {
      if (qs.length >= n) break;
      const ex = conceptExercise(c, String(seed));
      add({ id: `S:C:${c.id}`, estilo, conceptId: c.id, enunciado: c.pergunta, contexto: c.situacao, options: ex.options!.map((o) => ({ id: o.id, text: o.text, correct: o.correct, why: o.why })) });
    }
  }
  for (let pass = 0; pass < 3 && qs.length < n; pass++) {
    for (const id of arts) {
      if (qs.length >= n) break;
      if ((usedArt.get(id) ?? 0) > pass) continue;
      const hit = getArticle(id);
      if (!hit || !canTrainArticle(hit.art)) continue;
      const s = `${seed}:${id}:${pass}`;
      let q: Questao | null = null;
      if (estilo === 'fgv') {
        const ex = qs.filter((question) => question.dim === 'penas').length < Math.floor(n / 5) && buildCasePena(hit.law, hit.art, s);
        if (ex) q = { id: `S:${ex.key}`, estilo, lawId: hit.law.id, articleId: id, where: ex.where, dim: ex.dim, enunciado: ex.prompt, contexto: ex.context?.map((c) => c.t).join(' '), texto: ex.stem.map((c) => c.t).join(''), options: ex.options!.map((o) => ({ ...o })) };
      }
      if (!q) {
        const us = shuffle(hit.art.units.filter((unit) => !unit.rev && unit.k !== 'pena'), rng(s)).map((unit) => ({
          unit, priority: Math.max(0, ...questionTargets(hit.law, unit).map(({ target }) => target.priority ?? 0)),
        })).sort((a, b) => b.priority - a.priority).map(({ unit }) => unit);
        for (const u of us) { q = estilo !== 'cebraspe' ? qLeiSeca(hit.law, hit.art, u, s) : qCebraspe(hit.law, hit.art, u, s); if (q && !used.has(q.id) && (!fiveChoices || q.options?.length === 5)) break; q = null; }
      }
      if (q && add(q)) usedArt.set(id, (usedArt.get(id) ?? 0) + 1);
    }
  }
  return shuffle(qs, r).slice(0, n);
}

function tagDisciplines(questions: Questao[], area: AreaId | undefined, focus: string) {
  if (!area || area === 'geral') return questions;
  const cov = coverage(area);
  const topic = focus.startsWith('topico:') ? focus.slice(7) : focus.startsWith('topic-law:') ? focus.split(':').slice(2).join(':') : undefined;
  const items = topic ? cov.items.filter((item) => item.req.topico === topic) : cov.items;
  return questions.map((q) => {
    const id = q.articleId ?? CASE_BANK.find((concept) => concept.id === q.conceptId)?.refs.map((ref) => `${ref.law}.${ref.art}`).find((ref) => cov.byArticle.has(ref));
    if (!id) return q;
    const req = items.find((item) => cov.byArticle.get(id)?.includes(item.req.id))?.req;
    return req ? { ...q, disciplina: req.topico, bloco: req.bloco } : q;
  });
}

function createSimulado(estilo: Estilo, n: number, tempoMin: number | null, questoes: Questao[], area?: AreaId, edital?: Simulado['edital']): Simulado {
  const now = Date.now();
  return { id: `sim${now}-${Math.random().toString(36).slice(2, 7)}`, estilo, area, edital, n, tempoMin, createdAt: now, startedAt: now, title: edital ? EDITAL_SIMULADO[edital].title : '', questoes, respostas: {} };
}

export async function gerarSimulado(cfg: SessionConfig, estilo: Estilo, n: number, tempoMin: number | null): Promise<Simulado> {
  const questions = await collectQuestions(cfg, estilo, n, hashStr(`${Date.now()}`));
  const sim = createSimulado(estilo, n, tempoMin, tagDisciplines(questions, cfg.area, cfg.focus), cfg.area);
  if (sim.questoes.length) await saveSimulado(sim);
  return sim;
}

export async function gerarSimuladoEdital(area: 'tjsp' | 'tjms', tempoMin: number | null): Promise<Simulado> {
  await ensureLaws(areaLaws(area));
  const seed = hashStr(`edital:${area}:${Date.now()}`);
  const used = new Set<string>();
  const cov = coverage(area);
  const questoes: Questao[] = [];
  for (const block of EDITAL_SIMULADO[area].blocks) {
    const topics = new Map<string, Set<string>>();
    const blockQuestions: Questao[] = [];
    for (const item of cov.items) {
      if (item.req.bloco !== block.id || !item.articles.length) continue;
      const ids = topics.get(item.req.topico) ?? new Set<string>();
      item.articles.forEach((id) => ids.add(id));
      topics.set(item.req.topico, ids);
    }
    const shuffledTopics = shuffle([...topics], rng(`${seed}:${block.id}`));
    const practice = async (disciplina: string, ids: Set<string>, n: number, cases: boolean) => {
      if (!n) return;
      const cfg: SessionConfig = { area, focus: `topico:${disciplina}`, minutes: 0, mode: 'provar', articleIds: [...ids] };
      const scopeSeed = hashStr(`${seed}:${disciplina}:${blockQuestions.length}`);
      const save = (questions: Questao[]) => questions.forEach((q) => {
        used.add(q.id);
        blockQuestions.push({ ...q, disciplina, bloco: block.id });
      });
      const before = blockQuestions.length;
      if (cases && n >= 3) save(await collectQuestions(cfg, 'fgv', Math.floor(n / 3), scopeSeed, used, true));
      save(await collectQuestions(cfg, 'leiseca', n - (blockQuestions.length - before), scopeSeed, used, true));
    };
    for (const [idx, [topic, ids]] of shuffledTopics.entries()) {
      const n = Math.floor(block.n / topics.size) + (idx < block.n % topics.size ? 1 : 0);
      await practice(topic, ids, n, area === 'tjms' && block.id === 'Conhecimentos Específicos');
    }
    for (const [topic, ids] of shuffledTopics) {
      if (blockQuestions.length >= block.n) break;
      await practice(topic, ids, block.n - blockQuestions.length, false);
    }
    questoes.push(...shuffle(blockQuestions, rng(`${seed}:ordem:${block.id}`)));
  }
  const sim = createSimulado('leiseca', editalQuestionCount(area), tempoMin, questoes, area, area);
  const complete = EDITAL_SIMULADO[area].blocks.every((block) => questoes.filter((q) => q.bloco === block.id).length === block.n);
  if (complete) await saveSimulado(sim);
  return sim;
}

export function desempenhoDisciplinas(s: Simulado) {
  const groups = new Map<string, { topic: string; label: string; certas: number; erradas: number; branco: number; total: number }>();
  for (const q of s.questoes) {
    if (!q.disciplina) continue;
    const group = groups.get(q.disciplina) ?? { topic: q.disciplina, label: topicoLabel(q.disciplina), certas: 0, erradas: 0, branco: 0, total: 0 };
    const answer = s.respostas[q.id];
    const correct = isSimuladoAnswerCorrect(q, answer);
    group.total++;
    if (!answer) group.branco++;
    else if (correct) group.certas++;
    else group.erradas++;
    groups.set(q.disciplina, group);
  }
  const loss = (group: { erradas: number; branco: number }) => group.erradas * (s.estilo === 'cebraspe' ? 2 : 1) + group.branco;
  return [...groups.values()].sort((a, b) => loss(b) - loss(a) || a.certas / a.total - b.certas / b.total);
}

export function isSimuladoAnswerCorrect(question: Questao, answer: string | undefined) {
  if (!answer) return false;
  return question.estilo === 'cebraspe' ? answer === question.ce
    : !!question.options?.some((option) => option.id === answer && option.correct);
}

function simuladoDimension(question: Questao): Dim {
  if (question.dim) return question.dim;
  if (question.conceptId) return 'conceitual';
  if (question.estilo === 'fgv') return 'aplicacao';
  const [, , format, dimension] = question.id.split(':');
  return format === 'B' && (dimension === 'prazos' || dimension === 'penas' || dimension === 'excecoes') ? dimension : 'literal';
}

export function simuladoErrors(s: Simulado): Exercise[] {
  return s.questoes.flatMap((question) => {
    const given = s.respostas[question.id];
    if (!given || isSimuladoAnswerCorrect(question, given)) return [];
    const ce = question.estilo === 'cebraspe';
    const options = ce ? (['C', 'E'] as const).map((id) => ({
      id, text: id === 'C' ? 'Certo' : 'Errado', correct: id === question.ce,
      why: question.mutation?.note,
    })) : question.options ?? [];
    const correct = options.find((option) => option.correct);
    if (!correct) return [];
    const expected = question.target ?? correct.text;
    const text = question.texto ?? '';
    const blank = text.indexOf('________');
    const cloze = question.estilo === 'leiseca' && blank >= 0 && question.id.split(':')[2] === 'B';
    const context = question.contextoLegal ?? question.contexto;
    return [{
      key: question.conceptId ? `C:${question.conceptId}` : question.id,
      kind: ce ? 'ce' : cloze ? 'cloze-mc' : question.estilo === 'fgv' && question.contexto ? 'case' : 'mc5',
      dim: simuladoDimension(question), family: question.estilo === 'fgv' ? 'interpretacao' : 'literal',
      lawId: question.lawId, articleId: question.articleId, unitId: question.unitId, conceptId: question.conceptId,
      where: question.estilo === 'fgv' ? undefined : question.where,
      prompt: question.enunciado, context: context ? [{ t: context }] : undefined,
      stem: cloze ? [{ t: text.slice(0, blank) }, { t: expected, blank: true }, { t: text.slice(blank + 8) }] : text ? [{ t: text }] : [],
      answer: ce ? correct.text : expected, options, altered: question.mutation,
      expectedMs: 30_000, stage: 1,
    } satisfies Exercise];
  });
}


function simuladoIds(saved: unknown) {
  return [...new Set(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : [])];
}

export async function saveSimulado(s: Simulado) {
  await db.transaction('rw', db.kv, async () => {
    const key = `sim:${s.id}`;
    if (await db.kv.get(key)) return;
    await db.kv.put({ key, value: s });
    const list = simuladoIds((await db.kv.get('simulados'))?.value);
    if (!list.includes(s.id)) await db.kv.put({ key: 'simulados', value: [s.id, ...list].slice(0, 30) });
  });
}

export function simuladoDeadline(s: Simulado) {
  return s.tempoMin && s.tempoMin > 0 ? s.startedAt + s.tempoMin * 60_000 : null;
}

type SimuladoProgress = { position: number } | { questionId: string; optionId: string };

function validOption(question: Questao, optionId: string) {
  return question.estilo === 'cebraspe' ? optionId === 'C' || optionId === 'E'
    : question.options?.some((option) => option.id === optionId);
}

export async function updateSimulado(id: string, change: SimuladoProgress) {
  const at = Date.now();
  await db.transaction('rw', db.kv, async () => {
    const key = `sim:${id}`;
    const current = await loadSimulado(id);
    if (!current || current.finishedAt) return;
    const deadline = simuladoDeadline(current);
    if (deadline !== null && at >= deadline) return;
    if ('position' in change) {
      const { position } = change;
      if (!Number.isInteger(position) || position < 0 || position >= current.questoes.length) return;
      await db.kv.put({ key, value: { ...current, position } });
      return;
    }
    const { questionId, optionId } = change;
    const question = current.questoes.find((item) => item.id === questionId);
    if (!question || !validOption(question, optionId)) return;
    const value = current.respostas[questionId] === optionId ? '' : optionId;
    await db.kv.put({ key, value: { ...current, respostas: { ...current.respostas, [questionId]: value } } });
  });
}

export async function finishSimulado(id: string): Promise<Simulado> {
  try {
    return await db.transaction('rw', db.kv, db.cards, db.reviews, async () => {
      const existing = await loadSimulado(id);
      if (!existing) throw new Error('Simulado indisponível');
      if (existing.finishedAt) return existing;
      const result = { ...existing, finishedAt: Date.now() };
      for (const question of result.questoes) {
        const given = result.respostas[question.id];
        if (!given) continue;
        const answer = question.options?.find((option) => option.correct);
        const [, , format] = question.id.split(':');
        await recordAnswer({
          cardId: question.conceptId ? `C:${question.conceptId}` : question.id,
          base: { articleId: question.articleId, unitId: question.unitId, conceptId: question.conceptId, dim: simuladoDimension(question), type: 'simulado' },
          correct: isSimuladoAnswerCorrect(question, given),
          ms: 30000, expectedMs: 60000, mode: 'simulado', type: 'simulado',
          given: question.estilo === 'cebraspe' ? given : question.options?.find((option) => option.id === given)?.text,
          expected: answer?.text, target: question.target ?? question.mutation?.from ?? (format === 'B' ? answer?.text : undefined),
        });
      }
      await db.kv.put({ key: `sim:${id}`, value: result });
      return result;
    });
  } catch (error) {
    await loadCalibration();
    throw error;
  }
}

export function readSavedSimulado(value: unknown, id: string): Simulado | null {
  const saved = value as Simulado | null;
  if (!saved || saved.id !== id || !Array.isArray(saved.questoes) || !saved.respostas || typeof saved.respostas !== 'object'
    || Array.isArray(saved.respostas) || !Number.isFinite(saved.startedAt)
    || (saved.tempoMin != null && (!Number.isFinite(saved.tempoMin) || saved.tempoMin < 0))
    || (saved.finishedAt != null && !Number.isFinite(saved.finishedAt))
    || (saved.edital !== undefined && saved.edital !== 'tjsp' && saved.edital !== 'tjms')) return null;
  const ids = new Set<string>();
  const respostas: [string, string][] = [];
  for (const question of saved.questoes) {
    if (!question || typeof question.id !== 'string' || typeof question.enunciado !== 'string' || ids.has(question.id)) return null;
    if (![question.contexto, question.contextoLegal, question.texto, question.disciplina, question.officialText, question.target,
      question.mutation?.note, question.mutation?.from, question.mutation?.to]
      .every((text) => text == null || typeof text === 'string')) return null;
    if (question.dim != null && !DIMS.some(({ id }) => id === question.dim)) return null;
    if (question.estilo === 'cebraspe') {
      if (question.ce !== 'C' && question.ce !== 'E') return null;
    } else if ((question.estilo !== 'leiseca' && question.estilo !== 'fgv') || !Array.isArray(question.options)
      || !question.options.length || !question.options.every((option) => option && typeof option.id === 'string'
        && typeof option.text === 'string' && typeof option.correct === 'boolean' && (option.why == null || typeof option.why === 'string'))) return null;
    ids.add(question.id);
    const answer = saved.respostas[question.id];
    if (Object.hasOwn(saved.respostas, question.id) && (answer === '' || validOption(question, answer))) respostas.push([question.id, answer]);
  }
  return { ...saved, respostas: Object.fromEntries(respostas) };
}

export async function loadSimulado(id: string): Promise<Simulado | null> {
  return readSavedSimulado(await kvGet(`sim:${id}`, null), id);
}
export async function listSimulados(): Promise<Simulado[]> {
  const ids = simuladoIds(await kvGet('simulados', []));
  return (await Promise.all(ids.map(loadSimulado))).filter((x): x is Simulado => !!x?.questoes.length);
}

export function corrigir(s: Simulado) {
  let certas = 0, erradas = 0, branco = 0;
  for (const q of s.questoes) {
    const a = s.respostas[q.id];
    if (!a) { branco++; continue; }
    const ok = isSimuladoAnswerCorrect(q, a);
    if (ok) certas++; else erradas++;
  }
  const liquida = s.estilo === 'cebraspe' ? certas - erradas : certas;
  return { certas, erradas, branco, liquida, total: s.questoes.length };
}
export const letra = (i: number) => L[i] ?? String(i + 1);
