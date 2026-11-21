// Confere a base legal das notas de pegadinha: o artigo existe e contém o termo indicado.
import { readFileSync } from 'fs';
import { TRAPS } from '../src/content/traps';
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
let ok = 0, bad = 0;
for (const t of TRAPS) for (const r of t.refs) {
  const law = JSON.parse(readFileSync(`public/data/laws/${r.law}.json`, 'utf8'));
  const a = law.articles.find((x: any) => x.n === r.art);
  const txt = a ? fold(a.units.map((u: any) => u.t).join(' ')) : '';
  if (a && txt.includes(fold(r.termo))) ok++; else { bad++; console.log('DIVERGENTE', r.law, r.art, r.termo, a ? 'termo ausente' : 'artigo inexistente'); }
}
console.log(`Notas de pegadinha: ${ok} referências conferidas, ${bad} divergentes`);
if (bad) process.exit(1);
