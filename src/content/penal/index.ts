import { defineDoctrineBook, type PublishedDoctrineCourse } from '../doctrineBooks';
import { penalAdministracao } from './administracao';
import { penalCodigoParteEspecial } from './codigo-parte-especial';
import { penalCodigoParteGeral } from './codigo-parte-geral';
import { penalDignidadeEFamilia } from './dignidade-e-familia';
import { penalFundamentos } from './fundamentos';
import { penalIncolumidadeEFePublica } from './incolumidade-e-fe-publica';
import { penalJusticaEDemocracia } from './justica-e-democracia';
import { penalOrganizacoes } from './organizacoes';
import { penalPatrimonio } from './patrimonio';
import { penalPenas } from './penas';
import { penalPessoa } from './pessoa';
import { penalTeoriaDoDelito } from './teoria-do-delito';

export const PENAL_COURSE = {
  id: 'penal',
  title: 'Direito Penal',
  cover: 'penal',
  books: [
    defineDoctrineBook({
      id: 'penal1', trackTitle: 'Parte Geral',
      prefix: 'g', pageCount: 646, chapterCount: 33,
      sources: [penalFundamentos, penalTeoriaDoDelito, penalPenas],
      sections: [
        { title: 'Princípios e aplicação da lei penal', end: 10 },
        { title: 'Teoria do delito e concurso de pessoas', end: 22 },
        { title: 'Penas, dosimetria e execução', end: 30 },
        { title: 'Ação penal, punibilidade e prescrição', end: 33 },
      ],
    }),
    defineDoctrineBook({
      id: 'penal2', trackTitle: 'Crimes contra a pessoa e o patrimônio',
      prefix: 's', pageCount: 456, chapterCount: 24,
      sources: [penalPessoa, penalPatrimonio],
      sections: [
        { title: 'Vida, integridade física e saúde', end: 8 },
        { title: 'Honra, liberdade e privacidade', end: 12 },
        { title: 'Subtração, extorsão, usurpação e dano', end: 17 },
        { title: 'Apropriação, fraudes e receptação', end: 20 },
        { title: 'Propriedade imaterial, trabalho e respeito aos mortos', end: 24 },
      ],
    }),
    defineDoctrineBook({
      id: 'penal3', trackTitle: 'Dignidade sexual, fé pública e Administração',
      prefix: 'x', pageCount: 688, chapterCount: 30,
      sources: [penalDignidadeEFamilia, penalIncolumidadeEFePublica, penalAdministracao, penalJusticaEDemocracia],
      sections: [
        { title: 'Dignidade sexual e família', end: 7 },
        { title: 'Incolumidade, saúde e paz públicas', end: 11 },
        { title: 'Fé pública e certames', end: 16 },
        { title: 'Administração Pública, licitações e contratos', end: 23 },
        { title: 'Justiça, finanças e Estado Democrático de Direito', end: 30 },
      ],
    }),
    defineDoctrineBook({
      id: 'cp', trackTitle: 'Revisão do Código Penal',
      prefix: 'c', pageCount: 1336, chapterCount: 23, kind: 'bloco',
      sources: [penalCodigoParteGeral, penalCodigoParteEspecial],
      sections: [
        { title: 'Aplicação da lei, fato punível e autoria', end: 5 },
        { title: 'Cálculo da pena, execução e extinção da punibilidade', end: 11 },
        { title: 'Pessoa, liberdade, patrimônio e trabalho', end: 16 },
        { title: 'Família, paz pública e fé pública', end: 19 },
        { title: 'Administração, Justiça e jurisprudência dos crimes em espécie', end: 23 },
      ],
    }),
    defineDoctrineBook({
      id: 'organizacoes', trackTitle: 'Organizações criminosas',
      prefix: 'o', pageCount: 175, chapterCount: 13,
      sources: [penalOrganizacoes],
      sections: [
        { title: 'Lei 12.850/2013, enquadramento e investigação', end: 3 },
        { title: 'Colaboração premiada, ação controlada e infiltração', end: 8 },
        { title: 'Obstrução e Marco Legal do Combate ao Crime Organizado', end: 13 },
      ],
    }),
  ],
} satisfies PublishedDoctrineCourse;
