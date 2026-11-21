import { defineDoctrineBook, type PublishedDoctrineCourse } from '../doctrineBooks';
import { cadastrosDesconsideracao } from './cadastros-e-desconsideracao';
import { contratos } from './contratos';
import { fundamentos } from './fundamentos';
import { praticasComerciais } from './praticas-comerciais';
import { procedimentosEspeciais } from './procedimentos-especiais';
import { responsabilidade } from './responsabilidade';
import { tutelaColetiva } from './tutela-coletiva';
import { tutelaIndividual } from './tutela-individual';

export const CONSUMER_COURSE = {
  id: 'consumidor',
  title: 'Direito do Consumidor',
  cover: 'consumidor',
  books: [
    defineDoctrineBook({
      id: 'consumidor', trackTitle: 'Fundamentos e relação de consumo',
      prefix: 'a', pageCount: 153, chapterCount: 29, kind: 'bloco',
      sources: [fundamentos],
      sections: [
        { title: 'Constituição, CDC e diálogo das fontes', end: 4 },
        { title: 'Princípios, vulnerabilidade e mínimo existencial', end: 14 },
        { title: 'Fornecedor, consumidor e equiparação', end: 19 },
        { title: 'Produtos, serviços e relações setoriais', end: 29 },
      ],
    }),
    defineDoctrineBook({
      id: 'consumidorResponsabilidade', trackTitle: 'Responsabilidade civil e segurança',
      prefix: 'b', startPage: 154, pageCount: 165, chapterCount: 32, kind: 'bloco',
      sources: [responsabilidade],
      sections: [
        { title: 'Vícios, garantias e decadência', end: 8 },
        { title: 'Acidentes de consumo, serviços e vítimas equiparadas', end: 17 },
        { title: 'Excludentes, fraudes e contribuição da vítima', end: 27 },
        { title: 'Tabaco, recall e proteção de dados', end: 32 },
      ],
    }),
    defineDoctrineBook({
      id: 'consumidorContratos', trackTitle: 'Contratos, crédito e abusividade',
      prefix: 'c', startPage: 319, pageCount: 164, chapterCount: 29, kind: 'bloco',
      sources: [contratos],
      sections: [
        { title: 'Contratação, interpretação e revisão', end: 6 },
        { title: 'Boa-fé, arrependimento e garantia', end: 13 },
        { title: 'Cláusulas abusivas e controle', end: 21 },
        { title: 'Crédito responsável, adesão e resolução', end: 29 },
      ],
    }),
    defineDoctrineBook({
      id: 'consumidorMercado', trackTitle: 'Ofertas, práticas comerciais e cadastros',
      prefix: 'd', startPage: 483, pageCount: 166, chapterCount: 39, kind: 'bloco',
      sources: [praticasComerciais, cadastrosDesconsideracao],
      sections: [
        { title: 'Informação, ofertas e atendimento', end: 8 },
        { title: 'Publicidade, plataformas e proteção infantil', end: 14 },
        { title: 'Venda casada e outras práticas abusivas', end: 21 },
        { title: 'Cobrança e repetição do indébito', end: 26 },
        { title: 'Negativação, cadastro positivo e escore', end: 35 },
        { title: 'Desconsideração da personalidade jurídica', end: 39 },
      ],
    }),
    defineDoctrineBook({
      id: 'consumidorIndividual', trackTitle: 'Tutela individual do consumidor',
      prefix: 'e', startPage: 649, pageCount: 130, chapterCount: 25, kind: 'bloco',
      sources: [tutelaIndividual],
      sections: [
        { title: 'Jurisdição, conciliação, mediação e arbitragem', end: 6 },
        { title: 'Tutela específica e provisória, execução e multa', end: 13 },
        { title: 'Competência, intervenções e litisconsórcio', end: 20 },
        { title: 'Distribuição do ônus e produção de prova', end: 25 },
      ],
    }),
    defineDoctrineBook({
      id: 'consumidorColetivo', trackTitle: 'Tutela coletiva e procedimentos especiais',
      prefix: 'f', startPage: 779, pageCount: 237, chapterCount: 53, kind: 'bloco',
      sources: [tutelaColetiva, procedimentosEspeciais],
      sections: [
        { title: 'Direitos coletivos e competência', end: 8 },
        { title: 'Legitimidade e relação com as ações individuais', end: 17 },
        { title: 'Coisa julgada, despesas, liquidação e execução', end: 30 },
        { title: 'Incidente de desconsideração e matérias de defesa', end: 38 },
        { title: 'Habeas data e cadastros de consumo', end: 43 },
        { title: 'Superendividamento e repactuação de dívidas', end: 53 },
      ],
    }),
  ],
} satisfies PublishedDoctrineCourse;
