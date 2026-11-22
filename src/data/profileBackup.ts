import { db } from './db';
import { readProfilePlan } from './profiles';
import { getSettings } from '../ui/settings';

export const backupKey = (key: string) => key !== 'nav' && key !== 'corpus-manifest' && !key.startsWith('doutrina');

export async function createBackupBlob(plan = readProfilePlan()) {
  const progress = await db.transaction('r', db.cards, db.reviews, db.marks, db.kv, async () => {
    const [cards, reviews, marks, kv] = await Promise.all([db.cards.toArray(), db.reviews.toArray(), db.marks.toArray(), db.kv.toArray()]);
    return { cards, reviews, marks, kv: kv.filter(({ key }) => backupKey(key)) };
  });
  const data = { app: 'LEX', version: 3, at: new Date().toISOString(), settings: getSettings(), plan, ...progress };
  return new Blob([JSON.stringify(data)], { type: 'application/json' });
}

export async function exportBackup(plan = readProfilePlan()) {
  const blob = await createBackupBlob(plan);
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `lex-progresso-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  try { link.click(); }
  finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}
