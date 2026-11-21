import { defineDoctrineBook, type PublishedDoctrineCourse } from '../doctrineBooks';
import { processoPenalCompetenciaEProva } from './competencia-e-prova';
import { processoPenalCppInvestigacaoECompetencia } from './cpp-investigacao-e-competencia';
import { processoPenalCppProcedimentosERecursos } from './cpp-procedimentos-e-recursos';
import { processoPenalCppProvaECautelares } from './cpp-prova-e-cautelares';
import { processoPenalFundamentos } from './fundamentos';
import { processoPenalImpugnacoes } from './impugnacoes';
import { processoPenalInvestigacaoEAcao } from './investigacao-e-acao';
import { processoPenalPrisoesECautelares } from './prisoes-e-cautelares';
import { processoPenalProcedimentosEJuri } from './procedimentos-e-juri';
import { processoPenalProvasESujeitos } from './provas-e-sujeitos';
import { processoPenalSentencaERecursos } from './sentenca-e-recursos';

export const CRIMINAL_PROCEDURE_COURSE = {
  id: 'processo-penal',
  title: 'Direito Processual Penal',
  cover: 'processoPenal',
  books: [
    defineDoctrineBook({
      id: 'processoPenal', trackTitle: 'Fundamentos, investigação e ação penal',
      prefix: 'f', startPage: 1, pageCount: 221, chapterCount: 25, kind: 'bloco',
      sources: [processoPenalFundamentos, processoPenalInvestigacaoEAcao],
      sections: [
        { title: 'Teoria do processo e garantias constitucionais', end: 9 },
        { title: 'Investigação preliminar e juiz das garantias', end: 17 },
        { title: 'ANPP, titularidade e condições da ação penal', end: 23 },
        { title: 'Acusação e reparação decorrente do crime', end: 25 },
      ],
    }),
    defineDoctrineBook({
      id: 'processoPenalProvas', trackTitle: 'Competência, provas e sujeitos processuais',
      prefix: 'm', startPage: 222, pageCount: 340, chapterCount: 29, kind: 'bloco',
      sources: [processoPenalCompetenciaEProva, processoPenalProvasESujeitos],
      sections: [
        { title: 'Jurisdição, competência, exceções e incidentes', end: 10 },
        { title: 'Teoria da prova, admissibilidade e perícia', end: 18 },
        { title: 'Interrogatório, testemunhas e reconhecimento', end: 23 },
        { title: 'Busca, apreensão, comunicações e assistente', end: 29 },
      ],
    }),
    defineDoctrineBook({
      id: 'processoPenalCautelares', trackTitle: 'Prisões, cautelares e Tribunal do Júri',
      prefix: 'c', startPage: 562, pageCount: 289, chapterCount: 32, kind: 'bloco',
      sources: [processoPenalPrisoesECautelares, processoPenalProcedimentosEJuri],
      sections: [
        { title: 'Liberdade, flagrante e audiência de custódia', end: 7 },
        { title: 'Prisão preventiva, temporária e alternativas', end: 16 },
        { title: 'Medidas protetivas e cautelares patrimoniais', end: 20 },
        { title: 'Procedimentos comuns, especiais e Juizados', end: 26 },
        { title: 'Tribunal do Júri da pronúncia à sentença', end: 32 },
      ],
    }),
    defineDoctrineBook({
      id: 'processoPenalRecursos', trackTitle: 'Sentença, nulidades e recursos',
      prefix: 'r', startPage: 851, pageCount: 258, chapterCount: 33, kind: 'bloco',
      sources: [processoPenalSentencaERecursos, processoPenalImpugnacoes],
      sections: [
        { title: 'Sentença, correlação e coisa julgada', end: 7 },
        { title: 'Nulidades, prejuízo e aproveitamento dos atos', end: 10 },
        { title: 'Teoria geral, efeitos e admissibilidade recursal', end: 15 },
        { title: 'Recursos ordinários e excepcionais', end: 26 },
        { title: 'Revisão criminal, habeas corpus e mandado de segurança', end: 33 },
      ],
    }),
    defineDoctrineBook({
      id: 'cpp', trackTitle: 'CPP Comentado e jurisprudência',
      prefix: 'b', startPage: 1, pageCount: 1218, chapterCount: 41, kind: 'bloco',
      sources: [processoPenalCppInvestigacaoECompetencia, processoPenalCppProvaECautelares, processoPenalCppProcedimentosERecursos],
      sections: [
        { title: 'Normas fundamentais, investigação e ação penal', end: 9 },
        { title: 'Competência, incidentes e provas', end: 18 },
        { title: 'Sujeitos, cautelares, sentença e jurisprudência', end: 28 },
        { title: 'Procedimentos comuns, especiais e Júri', end: 34 },
        { title: 'Nulidades, impugnações, execução e súmulas', end: 41 },
      ],
    }),
  ],
} satisfies PublishedDoctrineCourse;
