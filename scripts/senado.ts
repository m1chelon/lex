// Fonte federal: normas.leg.br (Congresso Nacional/Senado) + conferência de atualização no Sicon (Senado).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import type { SourceDef } from '../src/core/sources';
import { decodeEntities } from '../src/core/html';

const curl = (url: string, dest: string) => execFileSync('curl', ['-sS', '-L', '--fail', '--max-time', '300', '-A', 'LEX-importador-de-legislacao/1.0', '-o', dest, url], { stdio: ['ignore', 'ignore', 'pipe'] });
const strip = (s: string) => decodeEntities(s.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ');

export interface SenadoInfo { versionLabel: string; contentUrl: string; encodingName: string; siconId?: string; amendments: number; lastAmendment?: string; notReflected: { norma: string; data: string; artigos: string[] }[] }

export function fetchSenado(s: SourceDef, rawDir: string, refresh: boolean): { file: string; info: SenadoInfo } {
  const metaFile = `${rawDir}/${s.id}.meta.json`;
  const file = `${rawDir}/${s.id}.htm`;
  if (refresh || !existsSync(metaFile)) curl(`https://normas.leg.br/api/public/normas?urn=${s.urn}&tipo_documento=maior-detalhe`, metaFile);
  const meta = JSON.parse(readFileSync(metaFile, 'utf8'));
  const encs: { version?: string; name?: string; contentUrl: string; encodingFormat?: string }[] = meta.encoding || [];
  const cur = encs.find((e) => e.version === 'Current' && !/Traduzida/i.test(e.name || '')) ?? encs.find((e) => e.version === 'Original');
  if (!cur) throw new Error('normas.leg.br sem texto disponível');
  const contentUrl = cur.contentUrl.replace('/api/binario/', '/api/public/binario/');
  if (refresh || !existsSync(file)) curl(contentUrl, file);

  // Conferência com o Sicon: alterações registradas x notas presentes na compilação
  const siconId = (meta.sameAs || []).map((x: string) => x.match(/DetalhaSigen\.action\?id=(\d+)/)?.[1]).find(Boolean);
  let amendments = 0, lastAmendment: string | undefined;
  const notReflected: SenadoInfo['notReflected'] = [];
  if (siconId) {
    const sf = `${rawDir}/sicon_${siconId}.html`;
    if (refresh || !existsSync(sf)) curl(`https://legis.senado.leg.br/norma/${siconId}`, sf);
    const t = strip(readFileSync(sf, 'utf8'));
    const i = t.indexOf('Normas que alteraram'), j = t.indexOf('Normas alteradas ou referenciadas');
    const seg = i >= 0 ? t.slice(i, j > i ? j : undefined) : '';
    const re = /((?:Lei Complementar|Lei|Emenda Constitucional|Medida Provisória|Decreto-Lei)\s+nº\s+([\d.]+)\s+de\s+(\d{2})\/(\d{2})\/(\d{4}))\s+Declaração de (Alteração|Revogação|Acréscimo)/g;
    const comp = strip(readFileSync(file, 'utf8'));
    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    const list: { norma: string; num: string; data: string; idx: number }[] = [];
    while ((m = re.exec(seg))) { if (seen.has(m[1])) continue; seen.add(m[1]); list.push({ norma: m[1], num: m[2], data: `${m[5]}-${m[4]}-${m[3]}`, idx: m.index }); }
    list.sort((a, b) => a.data.localeCompare(b.data));
    amendments = list.length;
    lastAmendment = list.length ? `${list[list.length - 1].norma}` : undefined;
    for (const a of list) {
      // compilação atual: alterações antigas já incorporadas; texto ORIGINAL: toda alteração conta
      if (cur.version === 'Current' && a.data < '2019-01-01') continue;
      const cited = new RegExp(`\\b${a.num.replace(/\./g, '\\.?')}\\b`).test(comp);
      if (cited) continue;
      const after = seg.slice(a.idx + a.norma.length);
      const next = after.search(/(?:Lei Complementar|Lei|Emenda Constitucional|Medida Provisória|Decreto-Lei|Decreto|Acórdão|Resolução|Portaria|Mensagem)\s+(?:nº|da|de)\s/);
      const block = after.slice(0, next > 0 ? next : 600);
      // pares "Art. X[, detalhe] - Tipo": só contam alterações de texto (não ressalvas, vetos ou correlações)
      const entries = [...block.matchAll(/Art\.?\s*([\d.]+(?:-[A-Z])?)([^-]*?)\s-\s([A-Za-zçãõéíáú ]+?)(?=\s+Art\.|\s*$|\s+Veja)/g)].map((x) => ({ art: x[1].replace(/\./g, ''), tipo: x[3].trim() }));
      const textual = entries.filter((e) => /Altera|Acr[ée]scimo|Revoga|Renumera|Inclus/i.test(e.tipo) && !/Vetad|Ressalva|Correlat|Declarad/i.test(e.tipo));
      if (!textual.length) continue;
      notReflected.push({ norma: a.norma, data: a.data, artigos: [...new Set(textual.map((e) => e.art))] });
    }
  }
  const versionLabel = `${cur.name?.replace(/\s+/g, ' ').trim()} — normas.leg.br${meta.dateModified ? `, atualizada em ${meta.dateModified.split('-').reverse().join('/')}` : ''}${siconId ? `; Sicon/Senado registra ${amendments} norma(s) alteradora(s)${lastAmendment ? `, a última ${lastAmendment}` : ''}` : ''}`;
  const info: SenadoInfo = { versionLabel, contentUrl, encodingName: cur.name || '', siconId, amendments, lastAmendment, notReflected };
  writeFileSync(`${rawDir}/${s.id}.senado.json`, JSON.stringify(info, null, 1));
  return { file, info };
}
