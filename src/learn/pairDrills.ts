import { ensureLaws, getArticle } from '../data/corpus';
import { unitContext, whereOf, type Exercise } from './generators';
import { rng, shuffle } from './text';

const PAIRS = [
  { label: 'Citação × intimação', items: [['cpc.238', 'Citação', 'Intimação'], ['cpc.269', 'Intimação', 'Citação']] },
  { label: 'Suspensão × interrupção', items: [['cc.201', 'Suspensa', 'Interrompida'], ['cc.202', 'interrupção', 'suspensão']] },
  { label: 'Reclusão × detenção', items: [['cp.33', 'reclusão', 'detenção'], ['cp.33', 'detenção', 'reclusão']] },
];

export async function buildPairDrill(seed: string): Promise<Exercise[]> {
  await ensureLaws(['cpc', 'cc', 'cp']);
  return PAIRS.flatMap(({ label, items }) => items.flatMap(([id, answer, wrong]) => {
    const hit = getArticle(id);
    if (!hit || hit.art.rev || hit.art.noCurrent || hit.art.outdated?.length) return [];
    const unit = hit.art.units.find((u) => !u.rev && u.k === 'caput' && u.t.includes(answer));
    if (!unit) return [];
    const start = unit.t.indexOf(answer);
    const key = `P:${id}:${answer.toLowerCase()}`;
    return [{
      key, kind: 'cloze-mc', dim: 'literal', family: 'literal', lawId: hit.law.id, articleId: id, unitId: unit.id,
      prompt: label, where: whereOf(hit.law, hit.art, unit), context: unitContext(hit.art, unit),
      stem: [{ t: `${hit.art.lab} `, strong: true }, { t: unit.t.slice(0, start) }, { t: answer, blank: true }, { t: unit.t.slice(start + answer.length) }],
      options: shuffle([{ id: 'ok', text: answer, correct: true }, { id: 'other', text: wrong, correct: false }], rng(seed + key)),
      answer, expectedMs: 20000, stage: 1,
    } satisfies Exercise];
  }));
}
