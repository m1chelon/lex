import { defineDoctrineBook, type PublishedDoctrineCourse } from '../doctrineBooks';
import { eleitoralCandidaturas } from './candidaturas';
import { eleitoralCrimesComunicacaoEDocumentos } from './crimes-comunicacao-e-documentos';
import { eleitoralCrimesEmLeisEspeciais } from './crimes-em-leis-especiais';
import { eleitoralCrimesGeraisEVotacao } from './crimes-gerais-e-votacao';
import { eleitoralFundamentos } from './fundamentos';
import { eleitoralIlicitosEProcesso } from './ilicitos-e-processo';
import { eleitoralProcessoPenal } from './processo-penal';
import { eleitoralPropagandaEVoto } from './propaganda-e-voto';

export const ELECTORAL_COURSE = {
  id: 'eleitoral',
  title: 'Direito Eleitoral',
  cover: 'eleit',
  books: [
    defineDoctrineBook({
      id: 'eleitoral', trackTitle: 'Direitos políticos e processo eleitoral',
      prefix: 'e', startPage: 1, pageCount: 976, chapterCount: 27,
      sources: [eleitoralFundamentos, eleitoralCandidaturas, eleitoralPropagandaEVoto, eleitoralIlicitosEProcesso],
      sections: [
        { title: 'Fundamentos, Justiça Eleitoral e partidos', end: 8 },
        { title: 'Elegibilidade, convenções e candidaturas', end: 13 },
        { title: 'Campanha, financiamento, pesquisa e propaganda', end: 17 },
        { title: 'Votação, diplomação e validade dos votos', end: 20 },
        { title: 'Ilícitos, ações e decisões eleitorais', end: 27 },
      ],
    }),
    defineDoctrineBook({
      id: 'eleitoralCrimes', trackTitle: 'Crimes e processo penal eleitoral',
      prefix: 'p', startPage: 977, pageCount: 501, chapterCount: 28, kind: 'bloco',
      sources: [
        eleitoralCrimesGeraisEVotacao, eleitoralCrimesComunicacaoEDocumentos,
        eleitoralCrimesEmLeisEspeciais, eleitoralProcessoPenal,
      ],
      sections: [
        { title: 'Teoria dos crimes eleitorais e efeitos da condenação', end: 2 },
        { title: 'Crimes no alistamento, na votação e na apuração', end: 8 },
        { title: 'Crimes na comunicação, na Justiça Eleitoral e nas campanhas', end: 15 },
        { title: 'Crimes no Código Penal e em leis especiais', end: 19 },
        { title: 'Investigação, ação penal e competência', end: 23 },
        { title: 'Procedimentos, garantias, recursos e revisão', end: 27 },
        { title: 'Debate legislativo sobre reforma penal eleitoral', end: 28 },
      ],
    }),
  ],
} satisfies PublishedDoctrineCourse;
