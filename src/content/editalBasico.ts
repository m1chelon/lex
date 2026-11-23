// Disciplinas não jurídicas dos editais, ligadas aos cursos de questões do LEX.
// Os tópicos resumem o conteúdo programático do Anexo VIII do Edital TJSP nº 02/2026 (VUNESP);
// confira a redação integral no edital oficial. Cada tópico aponta os blocos do curso que o treinam.
export interface EditalTopic { id: string; texto: string; chapters: string[] }
export interface EditalSubject {
  topico: string; // nome da disciplina como aparece na tela do edital
  courseId: string;
  topics: EditalTopic[];
}

export const PORTUGUES_TOPICS: EditalTopic[] = [
  { id: 'pt-1', texto: 'Análise, compreensão e interpretação de textos verbais, não verbais, literários e não literários', chapters: ['m15', 'm16', 'p07'] },
  { id: 'pt-2', texto: 'Informações literais e inferências possíveis', chapters: ['m16', 'm18', 'p07'] },
  { id: 'pt-3', texto: 'Ponto de vista do autor', chapters: ['m16', 'p07'] },
  { id: 'pt-4', texto: 'Estruturação do texto: relações entre ideias e recursos de coesão', chapters: ['m07', 'm17', 'p08'] },
  { id: 'pt-5', texto: 'Significação contextual de palavras e expressões', chapters: ['m13', 'p10'] },
  { id: 'pt-6', texto: 'Sinônimos e antônimos', chapters: ['m13'] },
  { id: 'pt-7', texto: 'Sentido próprio e figurado das palavras', chapters: ['m13', 'm14', 'p06'] },
  { id: 'pt-8', texto: 'Classes de palavras e os sentidos que imprimem às relações que estabelecem', chapters: ['m01', 'm02', 'm03', 'm04', 'm05', 'p05'] },
  { id: 'pt-9', texto: 'Concordância verbal e nominal', chapters: ['m10', 'p02'] },
  { id: 'pt-10', texto: 'Regência verbal e nominal', chapters: ['m08', 'p03'] },
  { id: 'pt-11', texto: 'Colocação pronominal', chapters: ['m11'] },
  { id: 'pt-12', texto: 'Crase', chapters: ['m09', 'p04'] },
  { id: 'pt-13', texto: 'Pontuação', chapters: ['m12', 'p01'] },
];

export const INFORMATICA_TOPICS: EditalTopic[] = [
  { id: 'in-1', texto: 'MS-Windows 10 ou superior: pastas, arquivos, atalhos, área de trabalho, área de transferência, menus, programas e integração com o Microsoft 365', chapters: ['i08', 's01', 's02'] },
  { id: 'in-2', texto: 'MS-Word: estrutura, edição e formatação, cabeçalhos, colunas, marcadores, tabelas, impressão, quebras e numeração de páginas, legendas, índices, objetos, campos e caixas de texto', chapters: ['i02', 'i04', 's03'] },
  { id: 'in-3', texto: 'MS-Excel: planilhas, células, gráficos, fórmulas, funções, macros, impressão, dados externos e classificação', chapters: ['i03', 'i04', 's04'] },
  { id: 'in-4', texto: 'MS-Teams: chats, chamadas, equipes, trabalho em conjunto com Word, Excel, PowerPoint, SharePoint e OneNote, agendamento e gravação de reuniões', chapters: ['s06', 's07'] },
  { id: 'in-5', texto: 'OneDrive: armazenamento e compartilhamento de arquivos', chapters: ['s05'] },
  { id: 'in-6', texto: 'Correio eletrônico: uso, envio de mensagens e anexos', chapters: ['i07', 's08'] },
  { id: 'in-7', texto: 'Internet: navegação, URL, links, sites, busca e impressão de páginas', chapters: ['i06', 'i07'] },
];

export const EDITAL_SUBJECTS: Record<'tjsp' | 'tjms', EditalSubject[]> = {
  tjsp: [
    { topico: 'Língua Portuguesa', courseId: 'portugues', topics: PORTUGUES_TOPICS },
    { topico: 'Informática', courseId: 'informatica', topics: INFORMATICA_TOPICS },
  ],
  // FGV: o programa de Português do TJMS tem o mesmo núcleo (interpretação, coesão e gramática).
  tjms: [{ topico: 'Língua Portuguesa', courseId: 'portugues', topics: PORTUGUES_TOPICS }],
};

export const editalSubject = (area: 'tjsp' | 'tjms', topico: string) =>
  EDITAL_SUBJECTS[area].find((subject) => subject.topico === topico);
