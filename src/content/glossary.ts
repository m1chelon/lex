import { PENAL } from './glossary-penal';
import { PROCESSO } from './glossary-processo';
import { ADM } from './glossary-adm';
import type { GlossaryTerm } from './types';

export const GLOSSARY: GlossaryTerm[] = [...PENAL, ...PROCESSO, ...ADM];
