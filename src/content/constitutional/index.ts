import { defineDoctrineBook, type PublishedDoctrineCourse } from '../doctrineBooks';
import { moraesCidadania } from './moraes-cidadania';
import { moraesControleEOrdens } from './moraes-controle-e-ordens';
import { moraesFundamentos } from './moraes-fundamentos';
import { moraesInstituicoes } from './moraes-instituicoes';
import { tavaresDireitos } from './tavares-direitos';
import { tavaresEstado } from './tavares-estado';
import { tavaresPoderes } from './tavares-poderes';
import { tavaresTeoria } from './tavares-teoria';

export const CONSTITUTIONAL_COURSE = {
  id: 'constitucional',
  title: 'Direito Constitucional',
  cover: 'const',
  books: [
    defineDoctrineBook({
      id: 'teoriaConstituicao', prefix: 't', pageCount: 1008, chapterCount: 59,
      trackTitle: 'Teoria da Constituição, direitos e instituições',
      sources: [tavaresTeoria, tavaresDireitos, tavaresEstado, tavaresPoderes],
      sections: [
        { title: 'Teoria da Constituição', end: 13 },
        { title: 'Direitos humanos', end: 15 },
        { title: 'Direitos individuais', end: 30 },
        { title: 'Direitos sociais e coletivos', end: 38 },
        { title: 'Estado e Poder', end: 59 },
      ],
    }),
    defineDoctrineBook({
      id: 'constitucional', prefix: 'm', pageCount: 1169, chapterCount: 16, kind: 'bloco',
      trackTitle: 'Constituição brasileira e suas aplicações',
      sources: [moraesFundamentos, moraesCidadania, moraesInstituicoes, moraesControleEOrdens],
      sections: [
        { title: 'Constituição, direitos e cidadania', end: 7 },
        { title: 'Organização, Poderes e controle constitucional', end: 12 },
        { title: 'Defesa do Estado, ordens constitucionais e tributos', end: 16 },
      ],
    }),
  ],
} satisfies PublishedDoctrineCourse;
