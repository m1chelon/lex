// Questões de APLICAÇÃO / caso (estilo FGV), separadas da literalidade.
// Montadas a partir do texto oficial: o caso descreve a conduta exatamente como no tipo penal,
// e as alternativas são rubricas/penas REAIS de outros dispositivos do mesmo diploma.
import type { Article, LawDoc } from '../core/types';
import { canTrainArticle, contextualAlternatives, findTargets, type Exercise, type Option } from './generators';
import { fold, normAnswer, rng, shuffle } from './text';

const NOMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fábio', 'Gabriela', 'Heitor', 'Inês', 'João', 'Larissa', 'Marcos', 'Natália', 'Otávio', 'Paula', 'Rafael', 'Sílvia', 'Tiago'];
const CONTEXTOS = [
  'Durante uma correição, apurou-se que {nome} praticou exatamente a conduta descrita a seguir:',
  'Em inquérito policial instaurado na comarca, ficou demonstrado que {nome} realizou a seguinte conduta:',
  'Ao analisar os autos, o juiz constatou que a conduta atribuída a {nome} corresponde, sem nenhum acréscimo, à seguinte descrição:',
  'Segundo a denúncia oferecida pelo Ministério Público, {nome} teria praticado esta conduta:',
];

function caputOf(art: Article) { return art.units.find((u) => u.k === 'caput' && u.t && !u.rev)?.t; }
const eligible = (a: Article) => !!a.rub && canTrainArticle(a) && (caputOf(a)?.length ?? 0) > 30;

function legalTerms(art: Article) {
  return new Set(normAnswer(`${art.rub ?? ''} ${caputOf(art) ?? ''}`).split(' ').filter((term) => term.length >= 6));
}

/** Identificação do crime/instituto a partir da conduta descrita (5 alternativas). */
export function buildCaseIdentify(law: LawDoc, art: Article, seed = ''): Exercise | null {
  if (!eligible(art)) return null;
  const caput = caputOf(art)!;
  if (normAnswer(caput).includes(normAnswer(art.rub!))) return null;
  const r = rng(`CI:${art.id}:${seed}`);
  const idx = law.articles.indexOf(art);
  const terms = legalTerms(art);
  const related = law.articles.slice(Math.max(0, idx - 40), idx + 41).filter((a) => eligible(a) && fold(a.rub!) !== fold(art.rub!));
  const prioritized = shuffle(related, r).map((candidate) => ({
    title: candidate.rub!,
    score: (art.h && art.h === candidate.h ? 4 : 0) + [...legalTerms(candidate)].filter((term) => terms.has(term)).length,
  })).sort((a, b) => b.score - a.score);
  const ds = [...new Map(prioritized.map(({ title }) => [normAnswer(title), title])).values()].slice(0, 4);
  if (ds.length < 4) return null;
  const nome = NOMES[Math.floor(r() * NOMES.length)];
  const ctx = CONTEXTOS[Math.floor(r() * CONTEXTOS.length)].replace('{nome}', nome);
  const options: Option[] = shuffle([{ id: 'ok', text: art.rub!, correct: true, why: `É a conduta descrita no ${art.lab} (${art.rub}).` }, ...ds.map((d, i) => ({ id: `d${i}`, text: d, correct: false, why: `“${d}” é outro dispositivo do ${law.short}, com elementos diferentes.` }))], r);
  return {
    key: `CI:${art.id}`, kind: 'case', dim: 'aplicacao', family: 'interpretacao', lawId: law.id, articleId: art.id, stage: 1,
    prompt: `Considerando o ${law.short}, a conduta de ${nome} corresponde a:`,
    context: [{ t: ctx }], stem: [{ t: `“${caput.replace(/:\s*$/, '')}”` }], options, answer: art.rub!, expectedMs: 45000,
    where: `${law.short} · ${art.lab}`,
  };
}

/** Pena cominada, com alternativas que variam a faixa, a espécie ou a cumulação. */
export function buildCasePena(law: LawDoc, art: Article, seed = ''): Exercise | null {
  if (!eligible(art)) return null;
  const unit = art.units.find((u) => u.k === 'pena' && u.t && !u.rev);
  const target = unit && findTargets(unit).find((item) => item.kind === 'pena');
  if (!target) return null;
  const pena = target.text;
  const r = rng(`CP:${art.id}:${seed}`);
  const ds = contextualAlternatives(law, target).slice(0, 4);
  if (ds.length < 4) return null;
  const nome = NOMES[Math.floor(r() * NOMES.length)];
  const options: Option[] = shuffle([{ id: 'ok', text: pena, correct: true, why: `Preceito secundário do ${art.lab} (${art.rub}).` }, ...ds.map((d, i) => ({ id: `d${i}`, text: d, correct: false, why: 'Essa combinação de espécie, faixa ou multa não é a prevista neste dispositivo.' }))], r);
  return {
    key: `CP:${art.id}`, kind: 'case', dim: 'penas', family: 'interpretacao', lawId: law.id, articleId: art.id, stage: 1,
    prompt: `${nome} foi condenado(a) por ${art.rub!.toLowerCase().startsWith('crime') ? '' : 'crime de '}${art.rub} (${law.short}, ${art.lab}), na forma simples. A pena cominada em abstrato é:`,
    stem: [], options, answer: pena, expectedMs: 40000, where: `${law.short} · ${art.lab}`,
  };
}
