// Tipos centrais do corpus legislativo do LEX.
// Regra de integridade: campos `t` de Unit contêm EXCLUSIVAMENTE texto oficial,
// copiado da fonte. Notas de alteração, rubricas e notas de rodapé ficam em
// campos próprios, e nada didático é misturado ao texto legal.

export type HeadingKind = 'parte' | 'livro' | 'titulo' | 'capitulo' | 'secao' | 'subsecao';
export type UnitKind = 'caput' | 'par' | 'inc' | 'ali' | 'item' | 'pena' | 'txt';

export interface Heading {
  id: string;
  kind: HeadingKind;
  label: string; // "CAPÍTULO III", "Seção IX"
  num: string; // "III", "IX", "IV-A"
  title: string; // "Dos Ofícios de Justiça em Geral"
  parent?: string;
  fn?: string[]; // notas de rodapé ligadas ao título
}

export interface OldVersion {
  lab?: string; // rótulo como na fonte ("Artigo 289", "§ 1°")
  t: string; // texto anterior (riscado na fonte oficial)
  notes?: string[];
}

export interface Unit {
  id: string; // "cp.312.p1.i2"
  k: UnitKind;
  lab: string; // "§ 1º", "II", "a)", "Parágrafo único", "Pena" — como na fonte
  t: string; // texto oficial, sem o rótulo
  parent?: string;
  rub?: string; // rubrica / nomen iuris imediatamente anterior (ex.: "Peculato culposo")
  notes?: string[]; // notas de alteração da fonte ("Redação dada pela Lei nº ...")
  fn?: string[]; // notas de rodapé da fonte (Normas da Corregedoria)
  old?: OldVersion[]; // redações anteriores constantes da fonte compilada
  rev?: boolean; // dispositivo revogado
}

export interface Article {
  id: string; // "cp.312"
  n: string; // "312", "311-A", "1091-A"
  sort: number;
  lab: string; // rótulo como na fonte: "Art. 312", "Artigo 241"
  h?: string; // id do heading mais específico
  rub?: string; // rubrica (nomen iuris) do artigo
  units: Unit[];
  rev?: boolean;
  noCurrent?: boolean; // a fonte compilada só apresenta redação anterior (riscada) — conferir na fonte
  outdated?: string[]; // normas alteradoras registradas (Sicon) não refletidas no texto: redação possivelmente desatualizada
  pg?: number; // página na fonte PDF
}

export interface Provenance {
  sourceName: string; // "Presidência da República — Planalto"
  sourceUrl: string;
  retrievedAt: string; // ISO
  sha256: string; // hash do arquivo bruto importado
  versionLabel: string; // ex.: "Última atualização: Lei nº 18.473, de 03/06/2026"
  method: 'automatico' | 'manual';
  parserVersion: string;
}

export interface LawDoc {
  id: string;
  title: string;
  short: string;
  provenance: Provenance;
  preamble: string[];
  headings: Heading[];
  articles: Article[];
  tail: string[];
  unplaced?: string[]; // redações anteriores sem dispositivo correspondente (ex.: títulos antigos)
  versions?: { label: string; articles: Article[] }[]; // ex.: texto original
  stats: ParseStats;
}

export interface ParseStats {
  sourceChars: number; // caracteres (sem espaços) no texto de origem considerado
  outputChars: number; // caracteres (sem espaços) presentes na saída estruturada
  articles: number;
  units: number;
  revoked: number;
  warnings: string[];
}

// Bloco intermediário (uma linha lógica da fonte)
export interface Block {
  t: string;
  struck?: boolean; // texto riscado (redação anterior)
  em?: boolean; // bloco inteiro em itálico (notas ALESP)
  heading?: boolean; // veio de <h1..h6>
  fn?: string[];
  pg?: number;
  brk?: boolean; // quebra forte antes do bloco (espaço grande no PDF)
}
