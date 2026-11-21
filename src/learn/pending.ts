// Pendências do jogador, em ordem de prioridade: alimentam o sino (central de avisos),
// o "próximo passo" sugerido pela Capi e o número no ícone do app (iOS 16.4+, se permitido).
import { getStats, type Stats } from './stats';
import { loadSession } from './session';
import { answeredToday } from './mood';
import { doutrinaMeta } from './doutrinaStore';
import { kvGet } from '../data/db';
import { getSettings } from '../ui/settings';
import { pontoHoje } from './ponto';

export type PendingKind = 'session' | 'ponto' | 'streak' | 'due' | 'goal' | 'mood' | 'doutrina' | 'weather' | 'tour';
export interface Pending { id: PendingKind; title: string; text: string; cta: string; urgent?: boolean }

export async function getPending(stats?: Stats): Promise<Pending[]> {
  const s = stats ?? await getStats();
  const now = new Date(); const h = now.getHours();
  const set = getSettings();
  const out: Pending[] = [];
  const sess = await loadSession().catch(() => null);
  if (sess && sess.index < sess.items.length && !sess.finishedAt) out.push({ id: 'session', title: 'Sessão pela metade', text: `Você parou em ${sess.index} de ${sess.items.length}. Que tal terminar?`, cta: 'Continuar' });
  const todayMin = Math.round(s.todayMs / 60000);
  if (s.todayCount > 0 && !(await pontoHoje().catch(() => true))) out.push({ id: 'ponto', title: 'Bata o ponto de hoje', text: `Você já estudou ${todayMin || 'alguns'} min hoje. Registre a presença na folha de ponto.`, cta: 'Bater o ponto' });
  if (s.streak > 0 && todayMin === 0 && h >= 18) out.push({ id: 'streak', title: `Ofensiva de ${s.streak} ${s.streak === 1 ? 'dia' : 'dias'} em risco`, text: 'Uma sessão rápida hoje mantém a chama acesa.', cta: 'Sessão de 5 min', urgent: true });
  if (s.due > 0) out.push({ id: 'due', title: `${s.due} ${s.due === 1 ? 'revisão pendente' : 'revisões pendentes'}`, text: 'Revisar na hora certa é o que fixa a lei na memória.', cta: 'Revisar agora' });
  if (todayMin > 0 && todayMin < set.dailyMinutes && h >= 19) out.push({ id: 'goal', title: `Faltam ${set.dailyMinutes - todayMin} min para a meta`, text: 'Você está perto. Fecha o dia com chave de ouro?', cta: 'Completar a meta' });
  if (set.wellbeing && h >= 17 && !(await answeredToday().catch(() => true))) out.push({ id: 'mood', title: 'Como você está hoje?', text: 'Um check-in de 10 segundos sobre o seu dia.', cta: 'Fazer check-in' });
  if (!import.meta.env.VITE_WITH_DOUTRINA && !(await doutrinaMeta().catch(() => null))) out.push({ id: 'doutrina', title: 'Doutrina não instalada', text: 'Importe seu acervo para ver o comentário após cada resposta.', cta: 'Importar' });
  if (set.weather.on && set.weather.lat === undefined) out.push({ id: 'weather', title: 'Clima no cumprimento', text: 'Escolha sua cidade para a Capi se vestir conforme o tempo.', cta: 'Escolher cidade' });
  if (!(await kvGet('tourDone', false))) out.push({ id: 'tour', title: 'Tour pelo LEX', text: 'A Capi mostra onde fica cada coisa em 1 minuto.', cta: 'Começar o tour' });
  return out;
}

/** Número no ícone do app (só com permissão de notificações, iOS 16.4+ instalado na tela de início). */
export function updateAppBadge(n: number) {
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    if (n > 0) void nav.setAppBadge?.(n); else void nav.clearAppBadge?.();
  } catch { /* sem suporte */ }
}
