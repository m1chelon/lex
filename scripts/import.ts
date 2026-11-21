// Importador do corpus legislativo do LEX.
// Uso: npm run import            (usa arquivos já baixados em raw/ quando existirem)
//      npm run import -- --refresh (baixa tudo novamente)
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SOURCES, EDITAL, type SourceDef } from '../src/core/sources';
import { importEsajJson, importHtmlSource, importLayoutPdf, importPdfLines, parseManualAnexo, sha256Hex, type LayoutLine, type LayoutLineX, type PdfLines } from '../src/core/importers';
import { REQUIREMENTS, resolveRequirement } from '../src/core/edital';
import { fetchSenado } from './senado';
import type { LawDoc } from '../src/core/types';

const ROOT = new URL('..', import.meta.url).pathname;
const RAW = join(ROOT, 'raw');
const OUT = join(ROOT, 'public/data');
const refresh = process.argv.includes('--refresh');
mkdirSync(join(OUT, 'laws'), { recursive: true });

const rawName = (s: SourceDef) => ({ planalto: `${s.id}.htm`, senado: `${s.id}.htm`, 'ms-legis': `ms/${s.id}.html`, manual: `manual/${s.id}.html`, alesp: `${s.id}.html`, esaj: `${s.id}.json`, 'pdf-ritjsp': `${s.id}.pdf`, 'pdf-nscgj': `${s.id}.pdf` })[s.kind];
const fetchUrl = (s: SourceDef) => (s.kind === 'esaj' ? `https://esaj.tjsp.jus.br/gcn-services/api/publico/legislacao/find/${s.esajId}` : s.url);
void fetchUrl;

function download(url: string, dest: string) {
  execFileSync('curl', ['-sS', '-L', '--fail', '--max-time', '300', '-A', 'LEX-importador-de-legislacao/1.0', '-o', dest, url], { stdio: ['ignore', 'ignore', 'pipe'] });
}

interface ManifestEntry {
  id: string; title: string; short: string; area: string; url: string; sourceName: string; manualHint: string;
  status: 'ok' | 'pendente'; error?: string; articles?: number; provenance?: LawDoc['provenance']; stats?: LawDoc['stats']; bytes?: number;
}

const manifest: ManifestEntry[] = [];
const docs = new Map<string, LawDoc>();

for (const s of SOURCES) {
  const file = join(RAW, rawName(s));
  const base: ManifestEntry = { id: s.id, title: s.title, short: s.short, area: s.area, url: s.url, sourceName: s.sourceName, manualHint: s.manualHint, status: 'pendente' };
  try {
    let senadoInfo: ReturnType<typeof fetchSenado>['info'] | null = null;
    const manualPdf = join(RAW, 'manual', `${s.id}.pdf`);
    if (s.kind === 'manual' && existsSync(manualPdf)) {
      const linesFile = join(ROOT, 'work', `${s.id}.layout.json`);
      mkdirSync(join(ROOT, 'work'), { recursive: true });
      if (refresh || !existsSync(linesFile) || statSync(linesFile).mtimeMs < statSync(manualPdf).mtimeMs) execFileSync('python3', ['-I', join(ROOT, 'scripts/extract_layout_pdf.py'), manualPdf, linesFile], { stdio: 'inherit' });
      const bytes = new Uint8Array(readFileSync(manualPdf));
      const lay = JSON.parse(readFileSync(linesFile, 'utf8')) as { blocks: LayoutLine[] };
      const txt = execFileSync('pdftotext', ['-l', '2', manualPdf, '-']).toString();
      const printed = txt.match(/(\d{2}\/\d{2}\/\d{4}), \d{2}:\d{2}/)?.[1];
      const dj = execFileSync('pdftotext', [manualPdf, '-']).toString().match(/DJMS n\.?º\s*[\d.]+, de [\d.]+/)?.[0];
      const versionLabel = s.id.startsWith('tse')
        ? `Texto compilado do TSE (tse.jus.br), salvo em PDF pelo usuário${printed ? ` em ${printed}` : ''}; redações anteriores tachadas na fonte ficam como versões anteriores`
        : `Documento oficial do TJMS em PDF, enviado pelo usuário${dj ? ` (${dj})` : ''}`;
      // anexo em formato de manual (Portaria TJMS 2.100/2021): artigos até "ANEXO DA PORTARIA", depois o Manual de Atribuições
      const iAnx = lay.blocks.findIndex((b) => /^ANEXO DA PORTARIA/.test(b.t.trim()));
      const doc = importLayoutPdf(s, iAnx > 0 ? lay.blocks.slice(0, iAnx) : lay.blocks, await sha256Hex(bytes), versionLabel, statSync(manualPdf).mtime.toISOString());
      if (iAnx > 0) {
        const rest = lay.blocks.slice(iAnx) as LayoutLineX[];
        const fin = rest.map((b, k) => (/^FINALIDADE, ESTRUTURA/.test(b.t.trim()) ? k : -1)).filter((k) => k >= 0);
        const bodyStart = fin.length > 1 ? fin[1] - 1 : 0; // pula o índice
        let tailAt = -1;
        rest.forEach((b, k) => { if (k > bodyStart && /^DJMS n\.?º.*\(caderno/.test(b.t.trim())) tailAt = k; });
        const anx = parseManualAnexo(s.id, rest.slice(bodyStart, tailAt > 0 ? tailAt : undefined));
        doc.headings.push(...anx.headings);
        doc.articles.push(...anx.articles);
        doc.stats.articles += anx.articles.length;
        doc.stats.units += anx.articles.reduce((n, a) => n + a.units.length, 0);
        doc.stats.sourceChars += anx.sourceChars; doc.stats.outputChars += anx.outChars;
        doc.stats.warnings.push(...anx.warnings);
        if (Math.abs(anx.sourceChars - anx.outChars) > 20) doc.stats.warnings.push(`Anexo: ${anx.sourceChars} caracteres na fonte x ${anx.outChars} na estrutura.`);
        doc.preamble.push('Anexo: Manual de Atribuições da Secretaria do Tribunal de Justiça do Estado de Mato Grosso do Sul.');
      }
      docs.set(s.id, doc);
      const json = JSON.stringify(doc);
      writeFileSync(join(OUT, 'laws', `${s.id}.json`), json);
      manifest.push({ ...base, status: 'ok', articles: doc.articles.length, provenance: doc.provenance, stats: doc.stats, bytes: json.length });
      console.log(`✓ ${s.id.padEnd(7)} ${String(doc.articles.length).padStart(5)} artigos  ${String(doc.stats.units).padStart(6)} dispositivos  avisos: ${doc.stats.warnings.length}  (PDF)`);
      continue;
    }
    if (s.kind === 'manual') {
      if (!existsSync(file)) throw new Error('aguardando arquivo enviado pelo usuário (raw/manual/' + s.id + '.html)');
    } else if (s.kind === 'senado') {
      senadoInfo = fetchSenado(s, `${RAW}/senado`, refresh).info;
    } else if (refresh || !existsSync(file) || statSync(file).size === 0) {
      process.stdout.write(`↓ ${s.id} ${fetchUrl(s)}\n`);
      mkdirSync(join(file, '..'), { recursive: true });
      download(fetchUrl(s), file);
    }
    const srcFile = s.kind === 'senado' ? `${RAW}/senado/${s.id}.htm` : file;
    const bytes = new Uint8Array(readFileSync(srcFile));
    const retrievedAt = statSync(srcFile).mtime.toISOString();
    let doc: LawDoc;
    if (s.kind === 'senado') {
      doc = await importHtmlSource(s, bytes, 'automatico', retrievedAt, senadoInfo!.versionLabel);
      doc.provenance.sourceUrl = senadoInfo!.contentUrl;
      // alterações registradas no Sicon que a compilação não cita: avisar, destacando artigos do edital
      for (const n of senadoInfo!.notReflected) {
        for (const a of n.artigos) { const art = doc.articles.find((x) => x.n === a); if (art) (art.outdated ||= []).push(`${n.norma} (${n.data.split('-').reverse().join('/')})`); }
        const req = new Set(REQUIREMENTS.filter((r) => r.law === s.id).flatMap((r) => resolveRequirement(doc, r).articles.map((a) => a.split('.')[1])));
        const hit = n.artigos.filter((a) => req.has(a));
        doc.stats.warnings.unshift(`Atualização: o Sicon registra ${n.norma} (${n.data.split('-').reverse().join('/')}) alterando art(s). ${n.artigos.join(', ') || '?'}, e a compilação não a cita. ${hit.length ? `ATINGE ARTIGO(S) EXIGIDO(S) NO EDITAL: ${hit.join(', ')} — conferir.` : 'Nenhum artigo exigido no edital é atingido.'}`);
      }
    } else if (s.kind === 'planalto' || s.kind === 'alesp' || s.kind === 'ms-legis' || s.kind === 'manual') doc = await importHtmlSource(s, bytes, s.kind === 'manual' ? 'manual' : 'automatico', retrievedAt);
    else if (s.kind === 'esaj') doc = await importEsajJson(s, bytes, 'automatico', retrievedAt);
    else {
      const linesFile = join(ROOT, 'work', `${s.id}.lines.json`);
      mkdirSync(join(ROOT, 'work'), { recursive: true });
      if (refresh || !existsSync(linesFile) || statSync(linesFile).mtimeMs < statSync(file).mtimeMs) {
        execFileSync('python3', ['-I', join(ROOT, 'scripts/extract_pdf.py'), file, linesFile, ...(s.kind === 'pdf-nscgj' ? ['--footnotes'] : [])], { stdio: 'inherit' });
      }
      const lines: PdfLines = JSON.parse(readFileSync(linesFile, 'utf8'));
      const info = execFileSync('pdfinfo', [file]).toString();
      const mod = info.match(/ModDate:\s+(.+)/)?.[1]?.trim();
      const first = lines.blocks.slice(0, 40).map((b) => b.t).join(' ');
      const upd = first.match(/(?:atualizad[oa]|texto atualizado)[^.]{0,60}?(\d{2}\/\d{2}\/\d{4})/i)?.[1];
      const versionLabel = s.kind === 'pdf-nscgj'
        ? `Tomo I — texto atualizado até 22/10/2026 (conforme página da Corregedoria)${mod ? `; PDF gerado em ${new Date(mod).toLocaleDateString('pt-BR')}` : ''}`
        : `PDF oficial do TJSP${upd ? `, atualizado até ${upd}` : ''}${mod ? `; arquivo gerado em ${new Date(mod).toLocaleDateString('pt-BR')}` : ''}`;
      doc = importPdfLines(s, lines, await sha256Hex(bytes), versionLabel, retrievedAt);
    }
    docs.set(s.id, doc);
    const json = JSON.stringify(doc);
    writeFileSync(join(OUT, 'laws', `${s.id}.json`), json);
    manifest.push({ ...base, status: 'ok', articles: doc.articles.length, provenance: doc.provenance, stats: doc.stats, bytes: json.length });
    console.log(`✓ ${s.id.padEnd(7)} ${String(doc.articles.length).padStart(5)} artigos  ${String(doc.stats.units).padStart(6)} dispositivos  avisos: ${doc.stats.warnings.length}`);
  } catch (e) {
    const msg = e instanceof Error ? (e as Error & { stderr?: Buffer }).stderr?.toString().trim() || e.message : String(e);
    manifest.push({ ...base, status: 'pendente', error: `Importação automática falhou: ${msg.split('\n')[0]}` });
    console.log(`✗ ${s.id.padEnd(7)} PENDENTE — ${msg.split('\n')[0]}`);
  }
}

// cobertura do edital
const coverage = REQUIREMENTS.map((req) => {
  const c = resolveRequirement(docs.get(req.law), req);
  return { reqId: req.id, law: req.law, articles: c.articles, missing: c.missing, lettered: c.lettered };
});
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), edital: EDITAL, laws: manifest }, null, 1));
writeFileSync(join(OUT, 'coverage.json'), JSON.stringify(coverage));

console.log('\nCOBERTURA DO EDITAL');
for (const c of coverage) {
  const req = REQUIREMENTS.find((r) => r.id === c.reqId)!;
  console.log(`${c.missing.length ? '!' : '✓'} ${req.id.padEnd(10)} ${String(c.articles.length).padStart(4)} artigos${c.missing.length ? '  faltando: ' + c.missing.slice(0, 6).join('; ') + (c.missing.length > 6 ? ` (+${c.missing.length - 6})` : '') : ''}${c.lettered.length ? '  [com letra: ' + c.lettered.join(', ') + ']' : ''}`);
}
