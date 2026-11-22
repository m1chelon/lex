// Simulados: lei seca (5 alternativas), Certo/Errado (estilo CEBRASPE) e casos (estilo FGV).
import type { Article, LawDoc, Unit } from '../core/types';
import { coverage, ensureLaws, getArticle } from '../data/corpus';
import { db, kvGet } from '../data/db';
import { buildLiteral, canTrainArticle, unitPath } from './generators';
import { buildCaseIdentify, buildCasePena } from './cases';
import { literalMutations, meaningMutations, type Mutation } from './mutations';
import { scopeArticles, scopeLaws, conceptExercise, conceptInScope, type SessionConfig } from './session';
import { areaLaws, EDITAL_TJMS, type AreaId } from '../core/areas';
import { EDITAL } from '../core/sources';
import { topicoLabel } from './plan';
import { CONCEPTS } from '../content/concepts';
import { loadCalibration, recordAnswer } from './scheduler';
import { hashStr, normAnswer, rng, shuffle } from './text';

export type Estilo = 'leiseca' | 'cebraspe' | 'fgv';
export interface SimOption { id: string; text: string; correct: boolean; why?: string }
export interface Questao {
  id: string; estilo: Estilo; lawId?: string; articleId?: string; unitId?: string; conceptId?: string;
  where?: string; enunciado: string; contexto?: string; texto?: string;
  disciplina?: string; bloco?: string;
  options?: SimOption[]; ce?: 'C' | 'E'; mutation?: Mutation; officialText?: string;
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

function unitsOf(art: Article): Unit[] { return art.units.filter((u) => u.t && !u.rev && u.t.length > 25); }

function qLeiSeca(law: LawDoc, art: Article, u: Unit, seed: string): Questao | null {
  const r = rng(seed);
  const where = `${law.short}, ${unitPath(art, u)}`;
  const lacuna = () => {
    for (const dim of ['prazos', 'penas', 'excecoes', 'literal'] as const) {
      const ex = buildLiteral(law, art, u, dim, 1, 'memorizar', seed, 5);
      if (ex?.kind !== 'cloze-mc' || !ex.options) continue;
      const texto = ex.stem.map((part) => part.blank ? '________' : part.t).join('');
      const options = ex.options.map((o) => ({ ...o, why: o.correct ? 'É a expressão exata da lei.' : `A lei não usa “${o.text}” neste ponto.` }));
      return { id: `S:${u.id}:B:${dim}`, estilo: 'leiseca' as const, lawId: law.id, articleId: art.id, unitId: u.id, where, enunciado: 'Assinale a alternativa que preenche corretamente a lacuna.', texto, options, officialText: u.t };
    }
    return null;
  };

  const textoIntegral = () => {
    const candidates = [...meaningMutations(law, u, seed), ...literalMutations(u)];
    const mutations = [...new Map(candidates.map((change) => [normAnswer(change.text), change])).values()];
    if (mutations.length < 4) return null;
    const wrong = shuffle(mutations, r).slice(0, 4).map((change, i) => ({ id: `m${i}`, text: change.text, correct: false, why: change.note }));
    const options = shuffle([{ id: 'ok', text: u.t, correct: true, why: 'Reproduz exatamente o texto oficial.' }, ...wrong], r);
    return { id: `S:${u.id}:A`, estilo: 'leiseca' as const, lawId: law.id, articleId: art.id, unitId: u.id, where, enunciado: `Qual alternativa reproduz a redação oficial? (${where})`, options, officialText: u.t };
  };
  return r() < 0.6 ? textoIntegral() ?? lacuna() : lacuna() ?? textoIntegral();
}

function qCebraspe(law: LawDoc, art: Article, u: Unit, seed: string): Questao | null {
  const r = rng(seed);
  const where = `${law.short}, ${unitPath(art, u)}`;
  const muts = meaningMutations(law, u, seed);
  if (!muts.length) return null;
  const alter = r() < 0.5;
  const m = alter ? muts[Math.floor(r() * muts.length)] : undefined;
  const text = m ? m.text : u.t;
  return { id: `S:${u.id}:CE`, estilo: 'cebraspe', lawId: law.id, articleId: art.id, unitId: u.id, where, enunciado: 'Julgue o item com base no dispositivo indicado.', texto: `Segundo o ${unitPath(art, u)}, ${text.charAt(0).toLowerCase()}${text.slice(1)}`, ce: m ? 'E' : 'C', mutation: m, officialText: u.t };
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
    for (const c of shuffle(CONCEPTS.filter((c) => conceptInScope(c, cfg, laws, scopedArticles)), r)) {
      if (qs.length >= Math.ceil(n * 0.4)) break;
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
        const ex = (pass % 2 === 0 ? buildCaseIdentify : buildCasePena)(hit.law, hit.art, s) ?? buildCaseIdentify(hit.law, hit.art, s);
        if (ex) q = { id: `S:${ex.key}`, estilo, lawId: hit.law.id, articleId: id, where: ex.where, enunciado: ex.prompt, contexto: ex.context?.map((c) => c.t).join(' '), texto: ex.stem.map((c) => c.t).join(''), options: ex.options!.map((o) => ({ ...o })) };
      } else {
        const us = shuffle(unitsOf(hit.art), rng(s));
        for (const u of us) { q = estilo === 'leiseca' ? qLeiSeca(hit.law, hit.art, u, s) : qCebraspe(hit.law, hit.art, u, s); if (q && !used.has(q.id) && (!fiveChoices || q.options?.length === 5)) break; q = null; }
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
    const id = q.articleId ?? CONCEPTS.find((concept) => concept.id === q.conceptId)?.refs.map((ref) => `${ref.law}.${ref.art}`).find((ref) => cov.byArticle.has(ref));
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
    const correct = q.estilo === 'cebraspe' ? answer === q.ce : q.options?.some((option) => option.id === answer && option.correct);
    group.total++;
    if (!answer) group.branco++;
    else if (correct) group.certas++;
    else group.erradas++;
    groups.set(q.disciplina, group);
  }
  const loss = (group: { erradas: number; branco: number }) => group.erradas * (s.estilo === 'cebraspe' ? 2 : 1) + group.branco;
  return [...groups.values()].sort((a, b) => loss(b) - loss(a) || a.certas / a.total - b.certas / b.total);
}


export async function saveSimulado(s: Simulado) {
  await db.transaction('rw', db.kv, async () => {
    const key = `sim:${s.id}`;
    if (await db.kv.get(key)) return;
    await db.kv.put({ key, value: s });
    const list = (await db.kv.get('simulados'))?.value as string[] | undefined;
    if (!list?.includes(s.id)) await db.kv.put({ key: 'simulados', value: [s.id, ...(list ?? [])].slice(0, 30) });
  });
}

export function simuladoDeadline(s: Simulado) {
  return s.tempoMin && s.tempoMin > 0 ? s.startedAt + s.tempoMin * 60_000 : null;
}

type SimuladoProgress = { position: number } | { questionId: string; optionId: string };

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
    if (!question || !(question.estilo === 'cebraspe' ? optionId === 'C' || optionId === 'E' : question.options?.some((option) => option.id === optionId))) return;
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
        const [, , format, dimension] = question.id.split(':');
        const dim = question.conceptId ? 'conceitual' : question.estilo === 'fgv' ? 'aplicacao'
          : format === 'B' && (dimension === 'prazos' || dimension === 'penas' || dimension === 'excecoes') ? dimension : 'literal';
        await recordAnswer({
          cardId: question.conceptId ? `C:${question.conceptId}` : question.id,
          base: { articleId: question.articleId, unitId: question.unitId, conceptId: question.conceptId, dim, type: 'simulado' },
          correct: question.estilo === 'cebraspe' ? given === question.ce : given === answer?.id,
          ms: 30000, expectedMs: 60000, mode: 'simulado', type: 'simulado',
          given: question.estilo === 'cebraspe' ? given : question.options?.find((option) => option.id === given)?.text,
          expected: answer?.text, target: question.mutation?.from ?? (format === 'B' ? answer?.text : undefined),
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

export async function loadSimulado(id: string): Promise<Simulado | null> {
  const saved = await kvGet<Simulado | null>(`sim:${id}`, null);
  if (!saved || !Array.isArray(saved.questoes) || !saved.respostas || !Number.isFinite(saved.startedAt)) return null;
  return saved;
}
export async function listSimulados(): Promise<Simulado[]> {
  const ids = await kvGet<string[]>('simulados', []);
  return (await Promise.all(ids.map(loadSimulado))).filter((x): x is Simulado => !!x?.questoes.length);
}

export function corrigir(s: Simulado) {
  let certas = 0, erradas = 0, branco = 0;
  for (const q of s.questoes) {
    const a = s.respostas[q.id];
    if (!a) { branco++; continue; }
    const ok = q.estilo === 'cebraspe' ? a === q.ce : q.options?.find((o) => o.id === a)?.correct;
    if (ok) certas++; else erradas++;
  }
  const liquida = s.estilo === 'cebraspe' ? certas - erradas : certas;
  return { certas, erradas, branco, liquida, total: s.questoes.length };
}
export const letra = (i: number) => L[i] ?? String(i + 1);
