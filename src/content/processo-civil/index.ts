import { defineDoctrineBook, type PublishedDoctrineCourse } from '../doctrineBooks';
import { processoCivilCumprimento } from './cumprimento';
import { processoCivilExecucaoETitulos } from './execucao-e-titulos';
import { processoCivilFundamentos } from './fundamentos';
import { processoCivilJuizadosEAcoesEspeciais } from './juizados-e-acoes-especiais';
import { processoCivilPenhoraEDefesa } from './penhora-e-defesa';
import { processoCivilProcedimentosContenciosos } from './procedimentos-contenciosos';
import { processoCivilProvaESentenca } from './prova-e-sentenca';
import { processoCivilRecursosExcepcionais } from './recursos-excepcionais';
import { processoCivilRecursosOrdinarios } from './recursos-ordinarios';
import { processoCivilSujeitosEAtos } from './sujeitos-e-atos';
import { processoCivilTribunaisEPrecedentes } from './tribunais-e-precedentes';
import { processoCivilTutelasEPostulacao } from './tutelas-e-postulacao';
import { processoCivilVoluntariaEArbitragem } from './voluntaria-e-arbitragem';

export const CIVIL_PROCEDURE_COURSE = {
  id: 'processo-civil',
  title: 'Direito Processual Civil',
  cover: 'processoCivil',
  books: [
    defineDoctrineBook({
      id: 'processoCivil', trackTitle: 'Fundamentos, competência e atos processuais',
      prefix: 'f', startPage: 1022, pageCount: 719, chapterCount: 28, kind: 'bloco',
      sources: [processoCivilFundamentos, processoCivilSujeitosEAtos],
      sections: [
        { title: 'Teoria geral e normas fundamentais', end: 10 },
        { title: 'Jurisdição, competência e cooperação', end: 13 },
        { title: 'Partes, procuradores e honorários', end: 18 },
        { title: 'Pluralidade de partes e demais sujeitos', end: 23 },
        { title: 'Atos, prazos, comunicações e nulidades', end: 28 },
      ],
    }),
    defineDoctrineBook({
      id: 'processoCivilConhecimento', trackTitle: 'Tutelas, conhecimento e prova',
      prefix: 'k', startPage: 1741, pageCount: 587, chapterCount: 30, kind: 'bloco',
      sources: [processoCivilTutelasEPostulacao, processoCivilProvaESentenca],
      sections: [
        { title: 'Tutelas provisórias', end: 7 },
        { title: 'Formação, postulação e defesa', end: 14 },
        { title: 'Saneamento, audiência e prova', end: 23 },
        { title: 'Sentença, coisa julgada e liquidação', end: 30 },
      ],
    }),
    defineDoctrineBook({
      id: 'processoCivilEspeciais', trackTitle: 'Procedimentos especiais, Juizados e ações coletivas',
      prefix: 'e', startPage: 2328, pageCount: 930, chapterCount: 32, kind: 'bloco',
      sources: [processoCivilProcedimentosContenciosos, processoCivilVoluntariaEArbitragem, processoCivilJuizadosEAcoesEspeciais],
      sections: [
        { title: 'Consignação, contas, posse e sociedade', end: 7 },
        { title: 'Inventário, terceiros, família e monitória', end: 14 },
        { title: 'Jurisdição voluntária e arbitragem', end: 21 },
        { title: 'Juizados, ações constitucionais e coletivas', end: 29 },
        { title: 'Locação, alienação fiduciária e arrendamento', end: 32 },
      ],
    }),
    defineDoctrineBook({
      id: 'processoCivilExecucao', trackTitle: 'Cumprimento de sentença e execução',
      prefix: 'x', startPage: 1, pageCount: 590, chapterCount: 32, kind: 'bloco',
      sources: [processoCivilCumprimento, processoCivilExecucaoETitulos, processoCivilPenhoraEDefesa],
      sections: [
        { title: 'Cumprimento, impugnação e pagamento', end: 7 },
        { title: 'Alimentos, Fazenda Pública e tutela específica', end: 12 },
        { title: 'Princípios, títulos e atos iniciais da execução', end: 20 },
        { title: 'Penhora, expropriação e satisfação', end: 27 },
        { title: 'Defesas, concurso de credores e prescrição', end: 32 },
      ],
    }),
    defineDoctrineBook({
      id: 'processoCivilTribunais', trackTitle: 'Tribunais, precedentes e recursos',
      prefix: 'r', startPage: 591, pageCount: 431, chapterCount: 28, kind: 'bloco',
      sources: [processoCivilTribunaisEPrecedentes, processoCivilRecursosOrdinarios, processoCivilRecursosExcepcionais],
      sections: [
        { title: 'Julgamento nos tribunais, precedentes e incidentes', end: 7 },
        { title: 'Ação rescisória, IRDR e reclamação', end: 12 },
        { title: 'Admissibilidade, apelação, agravos e embargos', end: 20 },
        { title: 'Tribunais superiores, repetitivos e transição', end: 28 },
      ],
    }),
  ],
} satisfies PublishedDoctrineCourse;
