import { defineDoctrineBook, type PublishedDoctrineCourse } from '../doctrineBooks';
import { agentes } from './agentes';
import { administrativoAtosEContratos } from './atos-e-contratos';
import { bensPublicos } from './bens-publicos';
import { controle } from './controle';
import { administrativoFundamentos } from './fundamentos';
import { integridadeConsenso } from './integridade-e-consenso';
import { licitacoes } from './licitacoes';
import { organizacao } from './organizacao';
import { processoResponsabilidade } from './processo-e-responsabilidade';

export const ADMINISTRATIVE_COURSE = {
  id: 'administrativo',
  title: 'Direito Administrativo',
  cover: 'administrativo',
  books: [
    defineDoctrineBook({
      id: 'administrativo', trackTitle: 'Fundamentos, poderes e serviços públicos',
      prefix: 'a', pageCount: 229, chapterCount: 29, kind: 'bloco',
      sources: [administrativoFundamentos],
      sections: [
        { title: 'Formação do Direito Administrativo e função administrativa', end: 7 },
        { title: 'Regime jurídico, princípios e poderes', end: 15 },
        { title: 'Serviços públicos e poder de polícia', end: 20 },
        { title: 'Intervenção na propriedade e desapropriação', end: 29 },
      ],
    }),
    defineDoctrineBook({
      id: 'administrativoContratos', trackTitle: 'Atos, contratos e licitações',
      prefix: 'b', startPage: 230, pageCount: 291, chapterCount: 48, kind: 'bloco',
      sources: [administrativoAtosEContratos, licitacoes],
      sections: [
        { title: 'Atos administrativos, requisitos e extinção', end: 11 },
        { title: 'Regime e execução dos contratos administrativos', end: 17 },
        { title: 'Concessões, PPPs, convênios e terceirização', end: 24 },
        { title: 'Princípios da licitação, agentes e contratação direta', end: 35 },
        { title: 'Modalidades, fases, recursos e procedimentos auxiliares', end: 48 },
      ],
    }),
    defineDoctrineBook({
      id: 'administrativoAgentes', trackTitle: 'Organização administrativa e agentes públicos',
      prefix: 'c', startPage: 521, pageCount: 302, chapterCount: 48, kind: 'bloco',
      sources: [organizacao, agentes],
      sections: [
        { title: 'Descentralização, autarquias, fundações e empresas estatais', end: 10 },
        { title: 'Agências, consórcios e supervisão', end: 16 },
        { title: 'Terceiro setor, parcerias e órgãos públicos', end: 23 },
        { title: 'Vínculos, ingresso, concursos e contratações temporárias', end: 31 },
        { title: 'Remuneração, acumulação, previdência e estabilidade', end: 43 },
        { title: 'Provimento, vacância e responsabilidades', end: 48 },
      ],
    }),
    defineDoctrineBook({
      id: 'administrativoProcesso', trackTitle: 'Processo administrativo, responsabilidade e bens públicos',
      prefix: 'd', startPage: 823, pageCount: 130, chapterCount: 26, kind: 'bloco',
      sources: [processoResponsabilidade, bensPublicos],
      sections: [
        { title: 'Processo administrativo e regime disciplinar', end: 8 },
        { title: 'Responsabilidade civil do Estado', end: 15 },
        { title: 'Classificação, alienação e uso dos bens públicos', end: 22 },
        { title: 'Terrenos de marinha, terras, águas e jazidas', end: 26 },
      ],
    }),
    defineDoctrineBook({
      id: 'administrativoControle', trackTitle: 'Controle, improbidade, anticorrupção e consensualidade',
      prefix: 'e', startPage: 953, pageCount: 185, chapterCount: 41, kind: 'bloco',
      sources: [controle, integridadeConsenso],
      sections: [
        { title: 'Controle administrativo, legislativo e financeiro', end: 8 },
        { title: 'Controle judicial, políticas públicas e Fazenda Pública em juízo', end: 12 },
        { title: 'Remédios constitucionais e tutela coletiva', end: 22 },
        { title: 'Improbidade administrativa', end: 31 },
        { title: 'Lei Anticorrupção e acordos de leniência', end: 37 },
        { title: 'Arbitragem, mediação e autocomposição', end: 41 },
      ],
    }),
  ],
} satisfies PublishedDoctrineCourse;
