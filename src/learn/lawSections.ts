import type { LawDoc } from '../core/types';

export interface LawSection {
  id: string;
  title: string;
  label?: string;
  roots: string[];
}

export function lawSections(law: LawDoc): LawSection[] {
  const roots = law.headings.filter(({ parent }) => !parent);
  const parts = roots.map(({ id, title, label }) => ({
    id,
    title: title || label.replace(/^PARTE (GERAL|ESPECIAL)$/i, (_, type: string) => type.toLowerCase() === 'geral' ? 'Parte Geral' : 'Parte Especial'),
    label: title ? label : undefined,
    roots: [id],
  }));
  // Na compilação do CP, os títulos da Parte Geral precedem o primeiro marcador de parte.
  const special = roots.findIndex(({ kind, label }) => kind === 'parte' && label === 'PARTE ESPECIAL');
  if (law.id === 'cp' && special > 0 && roots.slice(0, special).every(({ kind }) => kind !== 'parte')) {
    return [{ id: 'parte-geral', title: 'Parte Geral', roots: roots.slice(0, special).map(({ id }) => id) }, ...parts.slice(special)];
  }
  return parts;
}

export function articlesInSection(law: LawDoc, section: LawSection) {
  const included = new Set(section.roots);
  const children = new Map<string, string[]>();
  for (const { id, parent } of law.headings) {
    if (!parent) continue;
    const siblings = children.get(parent) ?? [];
    siblings.push(id);
    children.set(parent, siblings);
  }
  for (const id of included) for (const child of children.get(id) ?? []) included.add(child);
  return law.articles.filter(({ h, rev, noCurrent }) => h && included.has(h) && !rev && !noCurrent).map(({ id }) => id);
}
