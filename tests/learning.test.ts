import { describe, expect, it } from 'vitest';
import { checkTyped } from '../src/learn/text';
import { findTargets, buildLiteral, contextualAlternatives } from '../src/learn/generators';
import { meaningMutations } from '../src/learn/mutations';
import { wordDiff } from '../src/learn/diff';
import { gradeFor } from '../src/learn/scheduler';
import { Rating } from 'ts-fsrs';
import type { LawDoc, Unit } from '../src/core/types';

const u = (id: string, t: string, k: Unit['k'] = 'caput'): Unit => ({ id, k, lab: k === 'caput' ? 'Art. 1' : '§ 1º', t });
const law: LawDoc = {
  id: 'x', title: 'X', short: 'X', preamble: [], headings: [], tail: [],
  provenance: { sourceName: '', sourceUrl: '', retrievedAt: '', sha256: '', versionLabel: '', method: 'automatico', parserVersion: '' },
  stats: { sourceChars: 0, outputChars: 0, articles: 0, units: 0, revoked: 0, warnings: [] },
  articles: [
    { id: 'x.1', n: '1', sort: 1, lab: 'Art. 1', units: [u('x.1.cpt', 'A posse deverá verificar-se no prazo de 30 (trinta) dias, salvo motivo de força maior comprovado.')] },
    { id: 'x.2', n: '2', sort: 2, lab: 'Art. 2', units: [u('x.2.cpt', 'O recurso poderá ser interposto no prazo de 15 (quinze) dias.')] },
    { id: 'x.3', n: '3', sort: 3, lab: 'Art. 3', units: [u('x.3.cpt', 'A defesa será apresentada em 10 (dez) dias, exceto quando houver litisconsórcio.')] },
    { id: 'x.4', n: '4', sort: 4, lab: 'Art. 4', units: [u('x.4.cpt', 'O pedido deverá ser decidido em 5 (cinco) dias.')] },
  ],
};

describe('respostas digitadas', () => {
  it('aceita acentos, pontuação e as formas equivalentes de um numeral', () => {
    expect(checkTyped('30', '30 (trinta) dias').ok).toBe(false);
    expect(checkTyped('30 dias', '30 (trinta) dias').ok).toBe(true);
    expect(checkTyped('trinta dias', '30 (trinta) dias').ok).toBe(true);
    expect(checkTyped('30 (trinta) dias', '30 (trinta) dias').ok).toBe(true);
    expect(checkTyped('deverá', 'deverá').ok).toBe(true);
    expect(checkTyped('devera', 'deverá').ok).toBe(true);
    expect(checkTyped('poderá', 'deverá').ok).toBe(false);
    expect(checkTyped('15 (dez) dias', '10 (dez) dias').ok).toBe(false);
    expect(checkTyped('VINTE dias ou 5 horas!', '20 (vinte) dias ou 5 (cinco) horas').ok).toBe(true);
    expect(checkTyped('Até 1,5 ano!', 'até 1,5 ano').ok).toBe(true);
  });
  it('reprova omissões e trocas que alteram o sentido jurídico', () => {
    expect(checkTyped('se aplica aos recursos', 'não se aplica aos recursos').ok).toBe(false);
    expect(checkTyped('trinta dias', 'vinte dias').ok).toBe(false);
    expect(checkTyped('15 ano', '1,5 ano').ok).toBe(false);
    expect(checkTyped('12', '1/2').ok).toBe(false);
    expect(checkTyped('5 dias', '5 dias (úteis)').ok).toBe(false);
  });
});

describe('geração de exercícios literais', () => {
  it('identifica prazos, exceções e palavras-chave', () => {
    const dims = findTargets(law.articles[0].units[0]).map((t) => t.dim);
    expect(dims).toEqual(expect.arrayContaining(['prazos', 'excecoes', 'literal']));
  });
  it('esconde apenas o conector da exceção e mantém a condição visível', () => {
    const art = law.articles[0];
    const ex = buildLiteral(law, art, art.units[0], 'excecoes', 1, 'memorizar')!;
    expect(ex.kind).toBe('cloze-mc');
    expect(ex.answer).toBe('salvo');
    expect(ex.stem.filter((segment) => !segment.blank).map((segment) => segment.t).join('')).toContain('motivo de força maior comprovado');
  });
  it('distratores de prazo vêm de outros dispositivos reais da mesma lei', () => {
    const ex = buildLiteral(law, law.articles[0], law.articles[0].units[0], 'prazos', 1, 'memorizar')!;
    expect(ex.kind).toBe('cloze-mc');
    const wrong = ex.options!.filter((o) => !o.correct).map((o) => o.text);
    expect(wrong.every((w) => ['15 (quinze) dias', '10 (dez) dias', '5 (cinco) dias'].includes(w))).toBe(true);
    expect(ex.options!.find((o) => o.correct)!.text).toBe('30 (trinta) dias');
  });
  it('não preenche lacunas com termos de sufixo parecido e sentido alheio', () => {
    const art = { ...law.articles[0], units: [u('x.1.cpt', 'A constitucionalidade precede.'), u('x.1.p1', 'Responsabilidade, irregularidade, periculosidade e materialidade.', 'par')] };
    const sample = { ...law, id: 'sufixo', articles: [art] };
    expect(buildLiteral(sample, art, art.units[0], 'literal', 1, 'memorizar')).toBeNull();
    expect(buildLiteral(sample, art, art.units[0], 'literal', 1, 'provar')?.kind).toBe('cloze-type');
    expect(buildLiteral(sample, art, art.units[0], 'literal', 1, 'memorizar', '', 5)).toBeNull();
  });
  it('preserva a unidade do prazo e elimina formas do mesmo valor', () => {
    const unit = u('p.1.cpt', 'O prazo é de 30 (trinta) dias.');
    const art = { ...law.articles[0], units: [unit, u('p.1.p1', 'São 15 (quinze) dias, quinze dias, 30 (trinta) dias e 10 (dez) anos.', 'par')] };
    const sample = { ...law, id: 'prazo-compativel', articles: [art] };
    const target = findTargets(unit).find((t) => t.dim === 'prazos')!;
    expect(contextualAlternatives(sample, target)).toEqual(['15 (quinze) dias']);
    expect(meaningMutations(sample, unit, 'teste').filter((m) => m.from === target.text).map((m) => m.to)).toEqual(['15 (quinze) dias']);
  });
  it('altera a expressão do próprio artigo sem importar proibições de outro contexto', () => {
    const unit = u('x.7.cpt', 'É vedado à União, aos Estados e aos Municípios instituir a medida.');
    const targets = findTargets(unit);
    expect(targets.some((t) => t.dim === 'excecoes')).toBe(false);
    expect(contextualAlternatives(law, targets.find((t) => t.text === 'vedado')!, unit.t)).toEqual(['permitido', 'proibido', 'defeso']);
    expect(meaningMutations(law, unit, 'teste').some((m) => m.text.startsWith('É permitido à União'))).toBe(true);
  });
  it('evita quebrar a concordância do termo substituído com o artigo', () => {
    const unit = u('x.8.cpt', 'O dolo e a culpa serão provados.');
    expect(meaningMutations(law, unit, 'teste').some((m) => m.text.includes('O culpa') || m.text.includes('a dolo'))).toBe(false);
  });
  it('mantém lacunas com opções em todos os níveis do modo Memorizar', () => {
    for (const stage of [1, 2, 3, 4]) {
      const ex = buildLiteral(law, law.articles[0], law.articles[0].units[0], 'prazos', stage, 'memorizar')!;
      expect(ex.kind).toBe('cloze-mc');
      expect(ex.options?.filter((option) => option.correct)).toHaveLength(1);
      expect(ex.stem.filter((segment) => segment.blank)).toHaveLength(1);
    }
  });
  it('todo exercício literal mostra o artigo e a localização', () => {
    const ex = buildLiteral(law, law.articles[0], law.articles[0].units[0], 'prazos', 1, 'memorizar')!;
    expect(ex.stem[0]).toEqual({ t: 'Art. 1 ', strong: true });
    expect(ex.where).toBe('X · Art. 1');
  });
  it('modo Provar não oferece leitura nem múltipla escolha facilitada', () => {
    for (const st of [0, 1, 2, 3]) expect(buildLiteral(law, law.articles[1], law.articles[1].units[0], 'prazos', st, 'provar')!.kind).toBe('cloze-type');
    expect(buildLiteral(law, law.articles[1], law.articles[1].units[0], 'prazos', 3, 'provar')!.kind).toBe('cloze-type');
  });
});

describe('FSRS e comparação de redações', () => {
  it('converte desempenho em nota', () => {
    expect(gradeFor(false, 1000, 10000, 2)).toBe(Rating.Again);
    expect(gradeFor(true, 30000, 10000, 2)).toBe(Rating.Hard);
    expect(gradeFor(true, 9000, 10000, 2)).toBe(Rating.Good);
    expect(gradeFor(true, 3000, 10000, 3)).toBe(Rating.Easy);
  });
  it('diff por palavras', () => {
    const d = wordDiff('pena de dois a oito anos', 'pena de 2 (dois) a 12 (doze) anos');
    expect(d.filter((p) => p.op === 'del').map((p) => p.t.trim()).join(' ')).toContain('oito');
    expect(d.filter((p) => p.op === 'add').map((p) => p.t.trim()).join(' ')).toContain('12');
  });
});
