// Áreas de estudo: concursos (editais mapeados) e biblioteca geral.
import { REQUIREMENTS, type Requirement } from './edital';
import { EDITAL, SOURCES, type Ramo } from './sources';

export type AreaId = 'tjsp' | 'tjms' | 'geral';

export interface EditalInfo { id: string; title: string; orgao: string; publicacao: string; url: string; regra: string }

export const EDITAL_TJMS: EditalInfo = {
  id: 'tjms-2025',
  title: 'XI Concurso — Analista Judiciário, Área Fim (Bacharel em Direito)',
  orgao: 'Tribunal de Justiça de Mato Grosso do Sul — FGV',
  publicacao: 'Edital de abertura de 2025 com a 2ª retificação (FGV), Anexo I',
  url: 'https://conhecimento.fgv.br/sites/default/files/concursos/edital-com-2a-retificacao-tjms-servidores-1_0.pdf',
  regra: 'O conteúdo programático contempla legislação, jurisprudência e doutrina pertinentes aos temas. As alterações legislativas ocorridas após a publicação do Edital poderão ser exigidas nas provas.',
};

// Disciplinas do Anexo I (TJMS) e as normas citadas nominalmente em cada uma.
const TJMS_DISC: { topico: string; bloco: string; texto: string; leis: string[] }[] = [
  { topico: 'Noções de Legislação', bloco: 'Conhecimentos Básicos', texto: 'Estatuto dos Servidores (Lei 3.310/2006); Regimento Interno e Manual de Atribuições (Portaria 2.100/2021); Código de Ética (Res. 252/2021); Plano de Cargos e Carreiras (Lei 3.687/2009); Código de Organização e Divisão Judiciárias (Lei 1.511/1994); Gestão Antissuborno (Portarias 2.121/2021, 2.329/2022 com as alterações da 2.401/2022 e 2.209/2021).', leis: ['ms3310', 'tjmsp2100', 'tjmsres252', 'ms3687', 'ms1511', 'tjmsp2121', 'tjmsp2329', 'tjmsp2209'] },
  { topico: 'Direito Constitucional', bloco: 'Conhecimentos Específicos', texto: 'Constituição Federal (temas do Anexo I: princípios, direitos e garantias, organização do Estado e dos Poderes, controle de constitucionalidade, sistema tributário, ordem social, remédios constitucionais).', leis: ['cf', 'l9868'] },
  { topico: 'Direito Administrativo', bloco: 'Conhecimentos Específicos', texto: 'Lei 3.310/2006; RPPS-MS (Lei 3.150/2005); Lei 13.655/2018; LINDB; Improbidade (Lei 8.429/1992); Lei Anticorrupção (12.846/2013); Licitações (14.133/2021); PPP (11.079/2004).', leis: ['ms3310', 'ms3150', 'l13655', 'lindb', 'l8429', 'l12846', 'l14133', 'l11079'] },
  { topico: 'Direito Civil', bloco: 'Conhecimentos Específicos', texto: 'LINDB; Código Civil; Leis 8.560/92, 5.478/68, 11.804/08, 8.009/90; ECA; Inquilinato; CDC; Estatuto da Pessoa Idosa; Lei da Usura; Direitos autorais; DL 911/69; Leis 9.514/97, 10.931/04; Registros Públicos; Estatuto da Pessoa com Deficiência; Transplantes; Estatuto da Cidade; Lei 6.766/79; Lei do distrato; LGPD; Liberdade Econômica; RJET.', leis: ['lindb', 'cc', 'l8560', 'l5478', 'l11804', 'l8009', 'eca', 'l8245', 'cdc', 'idoso', 'd22626', 'l9610', 'dl911', 'l9514', 'l10931', 'lrp', 'l13146', 'l9434', 'l10257', 'l6766', 'l13786', 'lgpd', 'l13874', 'l14010'] },
  { topico: 'Direito Processual Civil', bloco: 'Conhecimentos Específicos', texto: 'CPC; Leis 8.437/1992 e 12.016/2009; Lei 9.868/1999; arbitragem e mediação; Juizados Especiais Cíveis, da Fazenda Pública e Federais.', leis: ['cpc', 'l8437', 'l12016', 'l9868', 'l9307', 'l13140', 'l9099', 'l12153', 'l10259'] },
  { topico: 'Direito Penal', bloco: 'Conhecimentos Específicos', texto: 'Código Penal; Abuso de autoridade; LEP; Preconceito racial; ECA (crimes); Hediondos; Licitações (crimes); Tortura; Lavagem; Pessoa Idosa (crimes); Desarmamento; Maria da Penha; Drogas; Organizações criminosas; Anticrime; CTB (crimes); CDC (crimes).', leis: ['cp', 'l13869', 'lep', 'l7716', 'eca', 'l8072', 'l14133', 'l9455', 'l9613', 'idoso', 'l10826', 'l11340', 'l11343', 'l12850', 'l13964', 'ctb', 'cdc'] },
  { topico: 'Direito Processual Penal', bloco: 'Conhecimentos Específicos', texto: 'CPP; LEP; Juizado Especial Criminal (Lei 9.099/95); Interceptação (9.296/96); Lavagem (9.613/98); Proteção a testemunhas (9.807/99); Organizações criminosas; Maria da Penha; Drogas; Anticrime.', leis: ['cpp', 'lep', 'l9099', 'l9296', 'l9613', 'l9807', 'l12850', 'l11340', 'l11343', 'l13964'] },
];

export const REQUIREMENTS_TJMS: Requirement[] = TJMS_DISC.flatMap((d) => d.leis.map((law) => ({
  id: `tjms-${d.topico.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]+/g, '-')}-${law}`,
  bloco: d.bloco, topico: d.topico, law, texto: d.texto, sel: [{ all: true as const }],
})));

export interface Area { id: AreaId; title: string; short: string; subtitle: string; requirements: Requirement[]; edital?: EditalInfo }

export const AREAS: Area[] = [
  { id: 'tjsp', title: 'TJSP — Escrevente Técnico Judiciário', short: 'TJSP', subtitle: 'Edital 02/2026 · 2ª a 10ª RAJs', requirements: REQUIREMENTS, edital: EDITAL },
  { id: 'tjms', title: 'TJMS — Analista Judiciário (Área Fim)', short: 'TJMS', subtitle: 'Edital FGV 2025 · leis citadas no Anexo I, na íntegra', requirements: REQUIREMENTS_TJMS, edital: EDITAL_TJMS },
  { id: 'geral', title: 'Direito em geral', short: 'Geral', subtitle: 'Toda a biblioteca, leis e códigos na íntegra', requirements: [] },
];
export const getArea = (id: AreaId) => AREAS.find((a) => a.id === id)!;

/** Leis de uma área (na ordem do edital ou por ramo, na geral). */
export function areaLaws(id: AreaId): string[] {
  if (id === 'geral') return SOURCES.map((s) => s.id);
  return [...new Set(getArea(id).requirements.map((r) => r.law))];
}

export const RAMOS: Ramo[] = ['Constitucional', 'Administrativo', 'Civil', 'Processual Civil', 'Penal', 'Processual Penal', 'Eleitoral', 'Direitos sociais', 'Interna TJSP', 'Interna TJMS'];
export const lawsByRamo = (r: Ramo) => SOURCES.filter((s) => s.ramo === r).map((s) => s.id);
