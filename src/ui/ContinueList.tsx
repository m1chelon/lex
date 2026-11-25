// "Continuar de onde parou": cada lei/escopo estudado na ordem guarda o próprio ponto.
// Ex.: parou no art. 7 do CP, foi para a CF até o art. 5 — os dois aparecem aqui para retomar.
import { ensureLaws, getArticle, getLaw } from '../data/corpus';
import { loadSequence, recentSequences } from '../learn/session';
import { MODE_INFO, type PlanMode } from '../learn/plan';
import { useLiveAsync } from './primitives';
import { nav } from './nav';
import { haptic } from './settings';
import { IPlay } from './icons';
import { focusLabel } from '../screens/Home';
import { recentDoctrineCourses } from '../learn/doctrineCourses';

type Entry = Awaited<ReturnType<typeof recentSequences>>[number];

type CourseRow = Awaited<ReturnType<typeof recentDoctrineCourses>>[number];
const COURSE_BADGE: Record<string, string> = { portugues: 'PT', informatica: 'INF' };

async function load(limit: number) {
  const [laws, courses] = await Promise.all([loadLaws(limit), recentDoctrineCourses(limit).catch(() => [] as CourseRow[])]);
  return [...laws.map((row) => ({ kind: 'lei' as const, at: row.entry.updatedAt, row })),
    ...courses.filter((c) => c.total).map((row) => ({ kind: 'curso' as const, at: row.at, row }))]
    .sort((a, b) => b.at - a.at).slice(0, limit);
}

async function loadLaws(limit: number) {
  const recent = (await recentSequences()).slice(0, limit * 2);
  const laws = [...new Set(recent.map((r) => r.articleId.split('.')[0]))];
  try { await ensureLaws(laws); } catch { /* sem rede: mostra só as leis já baixadas */ }
  const out: { entry: Entry; articleId: string; practiced: string[] }[] = [];
  for (const entry of recent) {
    // loadSequence corrige o ponto quando algum dispositivo anterior ficou sem prática.
    const fixed = await loadSequence(entry.config).catch(() => null);
    const articleId = fixed?.articleId ?? entry.articleId;
    if (!getArticle(articleId)) continue;
    out.push({ entry: fixed?.config ? { ...entry, config: fixed.config } : entry, articleId, practiced: fixed?.practiced ?? entry.practiced });
    if (out.length >= limit) break;
  }
  return out;
}

const ago = (at: number) => {
  const d = Math.floor((Date.now() - at) / 86400000);
  return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`;
};

export function ContinueList({ limit = 4, title = 'Continuar de onde parou' }: { limit?: number; title?: string }) {
  const rows = useLiveAsync(() => load(limit), [limit]);
  if (!rows?.length) return null;
  return (
    <section className="continue-list" aria-labelledby="continue-title">
      <h2 id="continue-title" className="title-s">{title}</h2>
      <div className="list">
        {rows.map((item) => {
          if (item.kind === 'curso') {
            const c = item.row;
            return (
              <button key={`curso:${c.courseId}`} className="list-item continue-item"
                onClick={() => { haptic('ok'); nav.push({ name: 'session', config: { area: 'geral', focus: 'auto', mode: 'memorizar', minutes: 7, title: c.title, activity: 'doctrine', doctrine: { courseId: c.courseId, filter: 'study' } } }); }}>
                <span className="continue-badge">{COURSE_BADGE[c.courseId] ?? 'Curso'}</span>
                <span className="grow" style={{ minWidth: 0 }}>
                  <strong>{c.title}</strong>
                  <small className="muted" style={{ display: 'block' }}>{c.nextModule ? `Próximo: ${c.nextModule}` : 'Curso concluído'} · {c.answered}/{c.total} · {ago(c.at)}</small>
                </span>
                <span className="continue-go"><IPlay size={14} /> Continuar</span>
              </button>
            );
          }
          const { entry, articleId, practiced } = item.row;
          const hit = getArticle(articleId)!;
          const law = getLaw(hit.law.id);
          const cfg = entry.config;
          const mode = MODE_INFO[cfg.mode as PlanMode]?.label ?? cfg.mode;
          const edital = cfg.area && cfg.area !== 'geral' ? ` · ${cfg.area.toUpperCase()}` : '';
          const scope = cfg.focus.startsWith('law:') ? edital : `${edital} · ${focusLabel(cfg.focus, cfg.area ?? 'geral')}`;
          return (
            <button key={JSON.stringify([cfg.area, cfg.focus, cfg.mode, cfg.mix])} className="list-item continue-item"
              onClick={() => { haptic('ok'); nav.push({ name: 'session', config: { ...cfg, startArticleId: articleId, sequenceSkip: practiced } }); }}>
              <span className="continue-badge">{law?.short ?? hit.law.id.toUpperCase()}</span>
              <span className="grow" style={{ minWidth: 0 }}>
                <strong>{hit.art.lab}</strong>
                <small className="muted" style={{ display: 'block' }}>{mode}{scope} · {ago(entry.updatedAt)}</small>
              </span>
              <span className="continue-go"><IPlay size={14} /> Continuar</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
