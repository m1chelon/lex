import { describe, expect, it } from 'vitest';
import { htmlToBlocks } from '../src/core/html';
import { classify, parseLaw, splitNotes } from '../src/core/parser';
import { startAtFirstArticle } from '../src/core/importers';
import { resolveRequirement, REQUIREMENTS } from '../src/core/edital';
import { checkRefAgainst } from '../src/core/verifyRefs';

// Amostra SINTÉTICA no formato de marcação usado pelo Planalto (apenas para teste do parser;
// não é conteúdo do app). Inclui texto riscado, notas de alteração, rubricas e "Pena".
const PLANALTO_LIKE = `<html><head><meta charset="windows-1252"><title>DEL2848compilado</title></head><body>
<p>Presidência da República</p>
<p align="center">TÍTULO XI</p><p align="center">DOS CRIMES CONTRA A ADMINISTRAÇÃO PÚBLICA</p>
<p align="center">CAPÍTULO I</p><p align="center">DOS CRIMES PRATICADOS POR FUNCIONÁRIO PÚBLICO CONTRA A ADMINISTRAÇÃO EM GERAL</p>
<p>Peculato</p>
<p><a name="art312"></a>Art. 312 - Apropriar-se o funcionário público de dinheiro, em proveito próprio ou alheio:</p>
<p>Pena - reclusão, de dois a doze anos, e multa.</p>
<p>§ 1º - Aplica-se a mesma pena, se o funcionário público, embora não tendo a posse, o subtrai.</p>
<p>Peculato culposo</p>
<p>§ 2º - Se o funcionário concorre culposamente para o crime de outrem:</p>
<p>Pena - detenção, de três meses a um ano.</p>
<p>Concussão</p>
<p><strike>Art. 316 - Exigir vantagem indevida:</strike></p>
<p><strike>Pena - reclusão, de dois a oito anos, e multa.</strike></p>
<p>Art. 316 - Exigir, para si ou para outrem, vantagem indevida: <a href="x">(Redação dada pela Lei nº 13.964, de 2019)</a></p>
<p>Pena - reclusão, de 2 (dois) a 12 (doze) anos, e multa. <a href="x">(Redação dada pela Lei nº 13.964, de 2019)</a></p>
<p>Art. 317-A. Texto de teste: <a href="y">(Incluído pela Lei nº 99.999, de 2099)</a></p>
<p>I - primeiro inciso;</p><p>II - segundo inciso; e</p><p>a) alínea de teste;</p>
<p>Art. 318. (Revogado pela Lei nº 1, de 2000)</p>
<p>Brasília, 7 de dezembro de 1940; 119º da Independência.</p>
</body></html>`;

describe('parser — formato Planalto', () => {
  const blocks = startAtFirstArticle(htmlToBlocks(PLANALTO_LIKE));
  const doc = parseLaw(blocks, { lawId: 'cp', title: 'CP', short: 'CP', provenance: { sourceName: '', sourceUrl: '', retrievedAt: '', sha256: '', versionLabel: '', method: 'manual', parserVersion: '' } });
  const A = Object.fromEntries(doc.articles.map((a) => [a.n, a]));

  it('estrutura artigos, títulos e rubricas', () => {
    expect(doc.articles.map((a) => a.n)).toEqual(['312', '316', '317-A', '318']);
    expect(A['312'].rub).toBe('Peculato');
    expect(doc.headings.map((h) => h.kind)).toEqual(['titulo', 'capitulo']);
    expect(doc.headings[1].title).toMatch(/FUNCIONÁRIO PÚBLICO/);
  });
  it('reconhece Pena, parágrafos e rubrica de parágrafo', () => {
    const u = A['312'].units;
    expect(u.map((x) => x.k)).toEqual(['caput', 'pena', 'par', 'par', 'pena']);
    expect(u[3].rub).toBe('Peculato culposo');
    expect(u[4].parent).toBe(u[3].id);
    expect(u[1].t).toBe('reclusão, de dois a doze anos, e multa.');
  });
  it('separa notas de alteração e guarda redação anterior (riscada)', () => {
    const caput = A['316'].units[0];
    expect(caput.t).toBe('Exigir, para si ou para outrem, vantagem indevida:');
    expect(caput.notes).toEqual(['Redação dada pela Lei nº 13.964, de 2019']);
    expect(caput.old?.[0].t).toBe('Exigir vantagem indevida:');
    expect(A['316'].units.find((x) => x.k === 'pena')!.old?.[0].t).toMatch(/dois a oito anos/);
  });
  it('hierarquia inciso/alínea e revogação', () => {
    const u = A['317-A'].units;
    expect(u.map((x) => x.k)).toEqual(['caput', 'inc', 'inc', 'ali']);
    expect(u[3].parent).toBe(u[2].id);
    expect(A['318'].rev).toBe(true);
    expect(doc.tail[0]).toMatch(/^Brasília/);
  });
  it('não perde texto (checagem de cobertura)', () => {
    expect(doc.stats.outputChars).toBe(doc.stats.sourceChars);
  });
});

describe('rótulos de artigo', () => {
  it.each([
    ['Art. 311-A. Adulterar', '311-A', 'Adulterar'],
    ['Artigo 26 - O funcionário', '26', 'O funcionário'],
    ['Art. 1.091-A. Teste', '1091-A', 'Teste'],
    ['Art. 806 A. A equipe', '806-A', 'A equipe'],
    ['Art. 1.111 - A. O serviço', '1111-A', 'O serviço'],
    ['Art. 5º Todos são iguais', '5', 'Todos são iguais'],
    ['Art. 406–B. A competência', '406-B', 'A competência'],
  ])('%s', (t, n, rest) => {
    const c = classify(t);
    expect(c.kind).toBe('art');
    expect(c.num).toBe(n);
    expect(c.rest).toBe(rest);
  });
  it('não confunde remissão com título', () => {
    expect(classify('Capítulo III destas Normas de Serviço').kind).not.toBe('head');
    expect(classify('CAPÍTULO III DOS OFÍCIOS DE JUSTIÇA EM GERAL').kind).toBe('head');
  });
  it('separa notas entre parênteses', () => {
    expect(splitNotes('o Tribunal Pleno; (Incluído pelo Assento Regimental nº 589/2024)')).toEqual({ text: 'o Tribunal Pleno;', notes: ['Incluído pelo Assento Regimental nº 589/2024'] });
  });
});

describe('edital e verificação', () => {
  it('resolve faixas e aponta lacunas', () => {
    const blocks = startAtFirstArticle(htmlToBlocks(PLANALTO_LIKE));
    const doc = parseLaw(blocks, { lawId: 'cp', title: 'CP', short: 'CP', provenance: { sourceName: '', sourceUrl: '', retrievedAt: '', sha256: '', versionLabel: '', method: 'manual', parserVersion: '' } });
    const c = resolveRequirement(doc, REQUIREMENTS.find((r) => r.id === 'penal-cp')!);
    expect(c.articles).toContain('cp.312');
    expect(c.articles).toContain('cp.316');
    expect(c.missing).toContain('art. 293 (não localizado na fonte)');
    expect(checkRefAgainst({ law: 'cp', art: '316', quote: 'para si ou para outrem' }, doc).status).toBe('verificado');
    expect(checkRefAgainst({ law: 'cp', art: '316', quote: 'dois a oito anos' }, doc).status).toBe('divergente');
    expect(checkRefAgainst({ law: 'cp', art: '316' }, undefined).status).toBe('pendente');
  });
});

import { unitPath, unitPathParts } from '../src/learn/generators';
describe('localização do dispositivo', () => {
  it('descreve artigo, parágrafo, inciso e alínea', () => {
    const blocks = startAtFirstArticle(htmlToBlocks(PLANALTO_LIKE));
    const doc = parseLaw(blocks, { lawId: 'cp', title: 'CP', short: 'CP', provenance: { sourceName: '', sourceUrl: '', retrievedAt: '', sha256: '', versionLabel: '', method: 'manual', parserVersion: '' } });
    const a = doc.articles.find((x) => x.n === '317-A')!;
    expect(unitPath(a, a.units[3])).toBe('Art. 317-A, inciso II, alínea a');
    const item = { id: 'cp.317-A.item1', k: 'item', lab: '1.', t: 'Texto do item', parent: a.units[3].id } as const;
    expect(unitPathParts({ ...a, units: [...a.units, item] }, item)).toEqual(['Art. 317-A', 'inciso II', 'alínea a', 'item 1']);
    const p = doc.articles.find((x) => x.n === '312')!;
    expect(unitPath(p, p.units[4])).toBe('Art. 312, § 2º, preceito secundário (pena)');
    expect(unitPathParts(p, p.units[4])).toEqual(['Art. 312', '§ 2º', 'preceito secundário (pena)']);
    expect(unitPathParts(p, p.units[0])).toEqual(['Art. 312', 'caput']);
  });
});
