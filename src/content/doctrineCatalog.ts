import { ADMINISTRATIVE_COURSE } from './administrativo';
import { CIVIL_COURSE } from './civil';
import { CONSTITUTIONAL_COURSE } from './constitutional';
import { CONSUMER_COURSE } from './consumidor';
import type { PublishedDoctrineCourse } from './doctrineBooks';
import { ELECTORAL_COURSE } from './electoral';
import { INFORMATICS_COURSE } from './informatica';
import { PORTUGUESE_COURSE } from './portugues';
import { PENAL_COURSE } from './penal';
import { CIVIL_PROCEDURE_COURSE } from './processo-civil';
import { CRIMINAL_PROCEDURE_COURSE } from './processo-penal';

export const PUBLISHED_DOCTRINE_COURSES: readonly PublishedDoctrineCourse[] = [
  PORTUGUESE_COURSE,
  INFORMATICS_COURSE,
  CONSTITUTIONAL_COURSE,
  ELECTORAL_COURSE,
  PENAL_COURSE,
  CIVIL_PROCEDURE_COURSE,
  CRIMINAL_PROCEDURE_COURSE,
  CIVIL_COURSE,
  ADMINISTRATIVE_COURSE,
  CONSUMER_COURSE,
];
