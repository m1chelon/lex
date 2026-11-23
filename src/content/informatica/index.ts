import { defineDoctrineBook, type PublishedDoctrineCourse } from '../doctrineBooks';
import { microsoft365 } from './microsoft365';
import { satinManual } from './satin';

export const INFORMATICS_COURSE = {
  id: 'informatica',
  title: 'Informática',
  subject: 'Informática',
  cover: 'informatica',
  books: [
    defineDoctrineBook({
      // "Páginas" = entradas 8 a 70 do sumário do EPUB (o livro digital não tem paginação impressa).
      id: 'informaticaSatin', prefix: 'i', startPage: 8, pageCount: 63, chapterCount: 10, kind: 'bloco',
      trackTitle: 'Conceitos e ferramentas para concursos',
      sources: [satinManual],
      sections: [
        { title: 'Hardware, Word, Excel e Office', end: 4 },
        { title: 'Bancos de dados, internet e correio eletrônico', end: 7 },
        { title: 'Windows, redes e segurança', end: 10 },
      ],
    }),
    defineDoctrineBook({
      // "Páginas" = fichas do Suporte Microsoft listadas em microsoft365.ts.
      id: 'microsoft365', prefix: 's', startPage: 1, pageCount: 12, chapterCount: 8, kind: 'bloco',
      trackTitle: 'Windows, Microsoft 365, Teams e OneDrive',
      sources: [microsoft365],
      sections: [
        { title: 'Windows e Microsoft 365', end: 2 },
        { title: 'Word e Excel', end: 4 },
        { title: 'OneDrive, Teams e Outlook', end: 8 },
      ],
    }),
  ],
} satisfies PublishedDoctrineCourse;
