import { defineDoctrineBook, type PublishedDoctrineCourse } from '../doctrineBooks';
import { martinoClasses } from './martino-classes';
import { martinoSintaxe } from './martino-sintaxe';
import { martinoTexto } from './martino-texto';
import { pestanaBancas } from './pestana';

// Páginas: numeração do PDF de cada obra (como aparece no leitor de PDF).
export const PORTUGUESE_COURSE = {
  id: 'portugues',
  title: 'Língua Portuguesa',
  subject: 'Língua Portuguesa',
  cover: 'portugues',
  books: [
    defineDoctrineBook({
      id: 'portuguesEsquematizado', prefix: 'm', startPage: 181, pageCount: 926, chapterCount: 18, kind: 'bloco',
      trackTitle: 'Gramática e texto para o edital',
      sources: [martinoClasses, martinoSintaxe, martinoTexto],
      sections: [
        { title: 'Classes de palavras e seus sentidos', end: 5 },
        { title: 'Sintaxe, regência, crase, concordância e colocação', end: 11 },
        { title: 'Pontuação', end: 12 },
        { title: 'Sentido das palavras e figuras', end: 14 },
        { title: 'Texto: interpretação, coesão e reescrita', end: 18 },
      ],
    }),
    defineDoctrineBook({
      id: 'gramaticaPestana', prefix: 'p', startPage: 890, pageCount: 421, chapterCount: 10, kind: 'bloco',
      trackTitle: 'Treino no estilo das bancas',
      sources: [pestanaBancas],
      sections: [
        { title: 'Pontuação, concordância, regência e crase', end: 4 },
        { title: 'Que, se, como e estilística', end: 6 },
        { title: 'Interpretação, coesão, registro e reescrita', end: 10 },
      ],
    }),
  ],
} satisfies PublishedDoctrineCourse;
