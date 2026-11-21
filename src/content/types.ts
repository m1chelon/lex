// Esquema do conteúdo didático. Separação obrigatória (item 13 da especificação):
// - texto legislativo oficial: NUNCA aqui — sempre lido do corpus importado (bloco 'lei');
// - explicação didática / interpretação / exemplo hipotético: campos rotulados;
// - redação incorreta: só gerada em exercícios e sempre identificada.
import type { Dim } from '../data/db';

/** Referência a dispositivo. `quote` deve constar do texto oficial do artigo (conferido pelo validador). */
export interface Ref { law: string; art: string; unit?: string; quote?: string }

/** Referência doutrinária ao acervo do usuário: trecho conferido na página indicada do PDF. */
export interface DocRef { obra: string; pagina: number; trecho: string }

export type Level = 'simples' | 'tecnico' | 'concurso';

export interface GlossaryTerm {
  id: string;
  termo: string;
  variantes: string[]; // formas que aparecem no texto legal (minúsculas, sem acento não é necessário)
  area: string;
  simples: string; // linguagem simples
  tecnico: string; // conceito técnico
  concurso: string; // foco em prova
  fundamentacao: Ref[];
  exemplo: string; // exemplo hipotético
  diferencas: { com: string; texto: string }[];
  excecoes?: string;
  pegadinhas: string[];
  doutrina?: DocRef[];
  relacionados?: string[];
  leis?: string[]; // detecção automática restrita a estas leis (termos polissêmicos)
  contexto?: string; // regex (sem acento, minúsculas) que deve ocorrer até 40 caracteres ao redor
}

export type LessonBlock =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'esquema'; titulo?: string; nos: string[] }
  | { tipo: 'tabela'; cabecalho: string[]; linhas: string[][] }
  | { tipo: 'exemplo'; texto: string }
  | { tipo: 'atencao'; texto: string }
  | { tipo: 'lei'; ref: Ref };

export interface Lesson {
  id: string;
  titulo: string;
  subtitulo: string;
  topicos: string[]; // ids de Requirement
  minutos: number;
  slides: { titulo: string; blocos: LessonBlock[] }[];
  checks: string[]; // ids de exercícios conceituais de compreensão
  refs: Ref[];
  doutrina?: DocRef[];
}

export interface ConceptOption { texto: string; correta: boolean; porque: string }
export interface Concept {
  id: string;
  tipo: 'associacao' | 'identificacao' | 'comparacao' | 'consequencia' | 'crime-conduta' | 'ato-finalidade' | 'excecao';
  topico: string; // id de Requirement
  dims: Dim[];
  situacao?: string; // exemplo hipotético (rotulado como tal)
  pergunta: string;
  opcoes: ConceptOption[];
  refs: Ref[];
  nivel: 1 | 2 | 3;
}

export interface Comparison {
  id: string;
  titulo: string;
  topico: string;
  colunas: { nome: string; termo?: string }[];
  linhas: { criterio: string; celulas: string[] }[];
  refs: Ref[];
}

export const TIPO_LABEL: Record<Concept['tipo'], string> = {
  associacao: 'Conceito × definição',
  identificacao: 'Identifique o instituto',
  comparacao: 'Compare institutos',
  consequencia: 'Consequência jurídica',
  'crime-conduta': 'Crime × conduta',
  'ato-finalidade': 'Ato processual × finalidade',
  excecao: 'Exceção à regra',
};
