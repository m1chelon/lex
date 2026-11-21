import { defineDoctrineBook, type PublishedDoctrineCourse } from '../doctrineBooks';
import { civilContratos } from './contratos';
import { civilDireitosReais } from './direitos-reais';
import { civilFamilia } from './familia';
import { civilObrigacoes } from './obrigacoes';
import { civilParteGeral } from './parte-geral';
import { civilSucessoes } from './sucessoes';

export const CIVIL_COURSE = {
  id: 'civil',
  title: 'Direito Civil',
  cover: 'civil',
  books: [
    defineDoctrineBook({
      id: 'civil1', trackTitle: 'Parte Geral e LINDB',
      prefix: 'g', pageCount: 745, chapterCount: 32, kind: 'bloco',
      sources: [civilParteGeral],
      sections: [
        { title: 'Vigência, interpretação, LINDB e codificação', end: 7 },
        { title: 'Pessoa natural, capacidades e personalidade', end: 14 },
        { title: 'Pessoas jurídicas, patrimônio e bens', end: 21 },
        { title: 'Fatos, negócios jurídicos e invalidade', end: 27 },
        { title: 'Prescrição, decadência e prova', end: 32 },
      ],
    }),
    defineDoctrineBook({
      id: 'civil2', trackTitle: 'Obrigações e Responsabilidade Civil',
      prefix: 'o', pageCount: 710, chapterCount: 33, kind: 'bloco',
      sources: [civilObrigacoes],
      sections: [
        { title: 'Estrutura, fontes e modalidades das obrigações', end: 8 },
        { title: 'Pagamento, consignação e extinção', end: 14 },
        { title: 'Inadimplemento, juros, garantias e transmissão', end: 21 },
        { title: 'Ilícito, culpa, causalidade e danos', end: 28 },
        { title: 'Regimes objetivos, excludentes e relação com o crime', end: 33 },
      ],
    }),
    defineDoctrineBook({
      id: 'civil3', trackTitle: 'Contratos',
      prefix: 't', pageCount: 846, chapterCount: 36, kind: 'bloco',
      sources: [civilContratos],
      sections: [
        { title: 'Estrutura, princípios e efeitos contratuais', end: 8 },
        { title: 'Formação, revisão, vícios e extinção', end: 18 },
        { title: 'Compra, venda, permuta e doação', end: 25 },
        { title: 'Locação, fiança, serviços, empréstimo e mandato', end: 31 },
        { title: 'Intermediação, transporte, arbitragem e garantias', end: 36 },
      ],
    }),
    defineDoctrineBook({
      id: 'civil4', trackTitle: 'Direitos Reais',
      prefix: 'd', pageCount: 893, chapterCount: 34, kind: 'bloco',
      sources: [civilDireitosReais],
      sections: [
        { title: 'Teoria dos direitos reais e posse', end: 6 },
        { title: 'Propriedade, acessão, usucapião e registro', end: 13 },
        { title: 'Vizinhança, condomínio e multipropriedade', end: 20 },
        { title: 'Direitos de uso e fruição e aquisição imobiliária', end: 28 },
        { title: 'Penhor, hipoteca, anticrese e alienação fiduciária', end: 34 },
      ],
    }),
    defineDoctrineBook({
      id: 'civil5', trackTitle: 'Família',
      prefix: 'f', pageCount: 930, chapterCount: 35, kind: 'bloco',
      sources: [civilFamilia],
      sections: [
        { title: 'Fundamentos e casamento', end: 8 },
        { title: 'Regimes de bens e pacto antenupcial', end: 14 },
        { title: 'Dissolução, guarda e união estável', end: 22 },
        { title: 'Parentesco, filiação, adoção e poder familiar', end: 27 },
        { title: 'Alimentos, bem de família, tutela e curatela', end: 35 },
      ],
    }),
    defineDoctrineBook({
      id: 'civil6', trackTitle: 'Sucessões',
      prefix: 's', pageCount: 739, chapterCount: 35, kind: 'bloco',
      sources: [civilSucessoes],
      sections: [
        { title: 'Abertura, herança, aceitação e exclusão', end: 11 },
        { title: 'Vocação legítima, concorrência e habitação', end: 21 },
        { title: 'Testamentos, legados e disposições de última vontade', end: 29 },
        { title: 'Inventário, colação, partilha e planejamento', end: 35 },
      ],
    }),
  ],
} satisfies PublishedDoctrineCourse;
