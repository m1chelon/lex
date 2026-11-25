// Mapa de domínio legislativo: cada artigo exigido pelo edital como uma célula.
import { TucaLoading } from '../ui/TucaLoading';
import { useMemo, useState } from 'react';
import { coverage, getArticle, articleTitle, getManifest } from '../data/corpus';
import { expectedNumbers } from '../core/edital';
import { getArea, areaLaws } from '../core/areas';
import { getStats } from '../learn/stats';
import { getCareer, careerLabel, RANKS } from '../learn/career';
import { Mascot } from '../ui/Mascot';
import { MoodSheet, MoodWeek } from '../ui/Wellbeing';
import { IClock, IFlame, IBrain, IGrowth, IPunch, IChevR, ICalendar } from '../ui/icons';
import { ForestGrid } from './Forest';
import { SectionHeader, Segmented } from '../ui/primitives';
import { setSettings, useSettings } from '../ui/settings';
import { ensureLaws, getLaw } from '../data/corpus';
import { SOURCES } from '../core/sources';
import { useEffect } from 'react';
import { masteryFor, LEVEL_LABEL, type ArticleMastery } from '../learn/mastery';
import { DIMS, db, type Dim } from '../data/db';
import { Ring, Sheet, useLiveAsync } from '../ui/primitives';
import { useAmbient } from '../ui/ambient';
import { nav } from '../ui/nav';
import { haptic } from '../ui/settings';
import { IPlay, IBook, IInfo, IProgressChart } from '../ui/icons';
import { useCorpusVersion } from '../App';
import { courseStats, loadArticleProgress } from '../learn/courseProgress';
import { StudyMetrics } from '../ui/StudyMetrics';
import { SubjectProgress } from './SubjectProgress';
import { historyArticleStatus } from '../learn/articleStatus';
import { STATUS_LABEL, StatusLegend } from '../ui/LawStatusMap';

type View = 'acertos' | 'geral' | Dim;

function levelOf(m: ArticleMastery | undefined, view: View): number {
  if (!m) return 0;
  if (view === 'geral' || view === 'acertos') return m.level;
  const d = m.dims[view];
  if (!d || (!d.applicable && !d.cards)) return -1; // não aplicável
  if (!d.cards) return 0;
  return Math.min(5, Math.max(1, Math.ceil(d.score * 5)));
}

export function MapScreen() {
  const { area } = useSettings();
  const [tab, setTab] = useState<'mapa' | 'floresta'>('mapa');
  useEffect(() => {
    if (area !== 'geral' || tab === 'floresta') void ensureLaws(areaLaws(area));
  }, [area, tab]);
  return (
    <div className="stack tab-content">
      <SectionHeader title="Progresso" icon={<span className="section-icon progress"><IProgressChart /></span>}
        right={<button className="btn btn-quiet btn-sm" onClick={() => nav.push({ name: 'planner' })}><ICalendar size={17} /> Planner</button>} />
      <ProgressTop />
      <h2 className="title-m">Domínio da legislação</h2>
      <Segmented label="Ver progresso de" value={area} options={[{ id: 'geral', label: 'Direito' }, { id: 'tjsp', label: 'TJSP' }, { id: 'tjms', label: 'TJMS' }]} onChange={(v) => setSettings({ area: v })} />
      <SubjectProgress key={area} area={area} />
      <Segmented label="Visão" value={tab} options={[{ id: 'mapa', label: area === 'geral' ? 'Mapa da lei' : 'Mapa do edital' }, { id: 'floresta', label: 'Floresta' }]} onChange={setTab} />
      {tab === 'floresta' ? <ForestGrid lawIds={areaLaws(area)} /> : area === 'geral' ? <LawMap /> : <EditalMap />}
    </div>
  );
}

function LawMap() {
  const [law, setLaw] = useState('cf');
  const v = useCorpusVersion();
  const [attempt, retry] = useState(0);
  const [checked, setChecked] = useState<string>();
  useEffect(() => {
    let active = true;
    void ensureLaws([law]).catch(() => {}).finally(() => { if (active) setChecked(law); });
    return () => { active = false; };
  }, [law, attempt]);
  const doc = getLaw(law);
  const ids = useMemo(() => doc?.articles.filter((a) => !a.rev).map((a) => a.id) ?? [], [doc, v]); // eslint-disable-line
  const mastery = useLiveAsync(() => masteryFor(ids), [ids]);
  const results = useLiveAsync(() => historyArticleStatus(ids), [ids]);
  const [colors, setColors] = useState<'acertos' | 'dominio'>('acertos');
  const progress = useLiveAsync(async () => {
    const scope = new Set(ids);
    return courseStats(await loadArticleProgress(scope), scope);
  }, [ids]);
  const [sel, setSel] = useState<string | null>(null);
  return (
    <div className="stack" style={{ gap: 12 }}>
      <select className="input" value={law} onChange={(e) => { setLaw(e.target.value); setChecked(undefined); }} aria-label="Lei">
        {SOURCES.filter((s) => s.kind !== 'manual' || getLaw(s.id)).map((s) => <option key={s.id} value={s.id}>{s.ramo} · {s.short}</option>)}
      </select>
      {progress && <StudyMetrics seen={progress.seen} total={ids.length} correct={progress.firstCorrect} attempts={progress.firstTotal} label="Cobertura da norma" />}
      {!doc ? checked !== law ? <TucaLoading msg="Baixando a lei" /> : (
        <div className="card stack">
          <p className="muted" role="status">Esta lei ainda está indisponível no aparelho.</p>
          <button className="btn btn-quiet" onClick={() => { setChecked(undefined); retry((n) => n + 1); }}>Tentar baixar novamente</button>
        </div>
      ) : (
        <div className="card">
          <div className="small muted" style={{ marginBottom: 10 }}>{doc.title} · {ids.length} artigos</div>
          <Segmented label="Cores do mapa" value={colors} options={[{ id: 'acertos', label: 'Acertos' }, { id: 'dominio', label: 'Domínio' }]} onChange={setColors} />
          <div style={{ margin: '10px 0' }}>{colors === 'acertos' ? <StatusLegend /> : <div className="legend xsmall muted" style={{ flexWrap: 'wrap', gap: 10 }}>{[0, 1, 2, 3, 4, 5].map((l) => <span key={l} className="legend"><i className={`cell l${l}`} style={{ width: 12, height: 12, aspectRatio: 'auto' }} />{LEVEL_LABEL[l]}</span>)}</div>}</div>
          <div className="mapgrid">
            {ids.map((id) => {
              const a = getArticle(id)!; const m = mastery?.get(id); const st = results?.get(id) ?? 'todo';
              const cls = colors === 'acertos' ? `cell s-${st}` : `cell l${m?.level ?? 0}${m?.due ? ' due' : ''}`;
              return <button key={id} className={cls} onClick={() => setSel(id)} aria-label={`${a.art.lab}: ${colors === 'acertos' ? STATUS_LABEL[st] : LEVEL_LABEL[m?.level ?? 0]}`}>{a.art.n.replace(/^[a-z]+\d*-/, '')}</button>;
            })}
          </div>
        </div>
      )}
      <ArticleSheet id={sel} mastery={sel ? mastery?.get(sel) : undefined} onClose={() => setSel(null)} />
    </div>
  );
}

function EditalMap() {
  const v = useCorpusVersion();
  const { area } = useSettings();
  const cov = coverage(area);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string, law: string) => { const next = new Set(open); if (next.has(id)) next.delete(id); else { void ensureLaws([law]); next.add(id); } setOpen(next); };
  const ids = useMemo(() => [...cov.required], [v, area]); // eslint-disable-line
  const mastery = useLiveAsync(() => masteryFor(ids), [ids]);
  const progress = useLiveAsync(async () => courseStats(await loadArticleProgress(cov.required), cov.required), [cov]);
  const [view, setView] = useState<View>('acertos');
  const results = useLiveAsync(() => historyArticleStatus(ids), [ids]);
  const [sel, setSel] = useState<string | null>(null);
  const manifest = getManifest();

  const levels = ids.map((id) => mastery?.get(id)?.level ?? 0);
  const counts = [0, 1, 2, 3, 4, 5].map((l) => levels.filter((x) => x === l).length);
  const dominated = counts[4] + counts[5];
  const pendingReqs = cov.items.filter((i) => !i.articles.length);
  const m = sel ? mastery?.get(sel) : undefined;
  const hit = sel ? getArticle(sel) : undefined;

  const REQS = getArea(area).requirements;
  return (
    <div className="stack" style={{ gap: 14 }}>
      {progress && <StudyMetrics seen={progress.seen} total={ids.length} correct={progress.firstCorrect} attempts={progress.firstTotal} label="Cobertura do edital" />}
      <div className="card elev row" style={{ gap: 16 }}>
        <Ring value={ids.length ? dominated / ids.length : 0} size={88} stroke={8}>
          <div style={{ fontWeight: 750, fontSize: 19 }}>{ids.length ? Math.round((dominated / ids.length) * 100) : 0}%</div>
          <div className="xsmall muted">compreendido</div>
        </Ring>
        <div className="grow stack" style={{ gap: 4 }}>
          <div className="small"><strong>{ids.length}</strong> <span className="muted">artigos exigidos importados</span></div>
          <div className="small"><strong>{counts[1] + counts[2] + counts[3]}</strong> <span className="muted">em memorização</span></div>
          <div className="small"><strong>{dominated}</strong> <span className="muted">compreendidos ou dominados</span></div>
          {pendingReqs.length > 0 && <button className="small row" style={{ color: 'var(--warn)', gap: 4 }} onClick={() => nav.push({ name: 'admin' })}><IInfo size={15} />{pendingReqs.length} item(ns) do edital aguardam importação</button>}
        </div>
      </div>

      <div className="hscroll"><div className="chips" style={{ flexWrap: 'nowrap' }}>
        {([{ id: 'acertos', label: 'Acertos' }, { id: 'geral', label: 'Domínio' }, ...DIMS.map((d) => ({ id: d.id, label: d.label }))] as { id: View; label: string }[]).map((o) => (
          <button key={o.id} className="chip" style={{ whiteSpace: 'nowrap' }} aria-pressed={view === o.id} onClick={() => { haptic('soft'); setView(o.id); }}>{o.label}</button>
        ))}
      </div></div>

      {view === 'acertos' ? <StatusLegend /> : <div className="legend xsmall muted" style={{ flexWrap: 'wrap', gap: 10 }}>
        {[0, 1, 2, 3, 4, 5].map((l) => <span key={l} className="legend"><i className={`cell l${l}`} style={{ width: 12, height: 12, aspectRatio: 'auto' }} />{view === 'geral' ? LEVEL_LABEL[l] : ['sem prática', '0–20%', '20–40%', '40–60%', '60–80%', '80–100%'][l]}</span>)}
        <span className="legend"><i className="cell pending" style={{ width: 12, height: 12, aspectRatio: 'auto' }} />lei pendente</span>
        <span className="legend"><i className="cell l0 due" style={{ width: 12, height: 12, aspectRatio: 'auto' }} />revisão devida</span>
      </div>}

      {REQS.map((req) => {
        const it = cov.items.find((i) => i.req.id === req.id)!;
        const isOpen = open.has(req.id);
        const arts = it.articles;
        const lv = arts.map((id) => mastery?.get(id)?.level ?? 0);
        const pct = arts.length ? lv.filter((x) => x >= 4).length / arts.length : 0;
        const expected = !arts.length ? expectedNumbers(req) : [];
        return (
          <section key={req.id} className="card" aria-label={req.texto}>
            <div className="row between" style={{ marginBottom: 4 }}>
              <div className="grow">
                <div className="caps">{req.topico} · Bloco {req.bloco}</div>
                <div className="small" style={{ fontWeight: 620, marginTop: 3 }}>{manifest?.laws.find((l) => l.id === req.law)?.short ?? req.law}</div>
              </div>
              <span className="small muted">{arts.length ? `${Math.round(pct * 100)}%` : 'pendente'}</span>
            </div>
            {area === 'tjsp' && <p className="xsmall muted" style={{ marginBottom: 10, lineHeight: 1.4 }}>{req.texto}</p>}
            <button className="btn btn-sm btn-ghost" aria-expanded={isOpen} onClick={() => toggle(req.id, req.law)}>{isOpen ? 'Ocultar artigos' : arts.length === 1 ? 'Ver 1 artigo' : `Ver ${arts.length || ''} artigos`}</button>
            {isOpen && <div className="mapgrid" style={{ marginTop: 10 }}>
              {arts.map((id) => {
                const a = getArticle(id)!;
                const ma = mastery?.get(id);
                const l = levelOf(ma, view);
                return (
                  <button key={id} className={view === 'acertos' ? `cell s-${results?.get(id) ?? 'todo'}` : `cell l${Math.max(0, l)}${ma?.due ? ' due' : ''}`} style={l < 0 ? { opacity: 0.25 } : undefined} onClick={() => { haptic('soft'); setSel(id); }}
                    aria-label={`${articleTitle(req.law, a.art)}: ${LEVEL_LABEL[ma?.level ?? 0]}`}>
                    {a.art.n.replace(/^dt-/, 'T')}
                  </button>
                );
              })}
              {expected.map((n) => <div key={n} className="cell pending" title={`Art. ${n} — aguardando importação`}>{n}</div>)}
            </div>}
            {!arts.length && req.previstos && <p className="xsmall" style={{ color: 'var(--warn)', marginTop: 8 }}>Previsto: {req.previstos}. Importe a norma no painel de fontes.</p>}
            {it.missing.filter((x) => x !== 'Lei não importada').length > 0 && <p className="xsmall" style={{ color: 'var(--warn)', marginTop: 8 }}>Não localizado na fonte: {it.missing.filter((x) => x !== 'Lei não importada').join('; ')}</p>}
          </section>
        );
      })}

      <ArticleSheet id={sel} mastery={m} onClose={() => setSel(null)} />
    </div>
  );
}

function ArticleSheet({ id, mastery: m, onClose }: { id: string | null; mastery?: ArticleMastery; onClose: () => void }) {
  const hit = id ? getArticle(id) : undefined;
  return (
    <Sheet open={!!id} onClose={onClose} label="Detalhe do artigo">
      {hit && (
        <div className="stack" style={{ gap: 12 }}>
          <div>
            <div className="caps">{hit.law.short}</div>
            <div className="title-l" style={{ marginTop: 4 }}>{hit.art.lab}{hit.art.rub ? <span className="gold" style={{ fontSize: 16 }}> · {hit.art.rub}</span> : null}</div>
            <p className="small muted" style={{ marginTop: 6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{hit.art.units[0]?.t}</p>
          </div>
          <div className="badge badge-gold" style={{ alignSelf: 'flex-start' }}>{LEVEL_LABEL[m?.level ?? 0]}</div>
          <div className="stack" style={{ gap: 8 }}>
            {DIMS.map((d) => { const x = m?.dims[d.id]; if (!x || (!x.applicable && !x.cards)) return null; return <div key={d.id} className="dimbar"><span className="muted">{d.label}</span><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.round(x.score * 100)}%` }} /></div><span className="xsmall muted" style={{ textAlign: 'right' }}>{Math.round(x.score * 100)}%</span></div>; })}
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-quiet grow" onClick={() => { onClose(); nav.push({ name: 'article', id: hit.art.id }); }}><IBook size={17} /> Ler</button>
            <button className="btn btn-primary grow" onClick={() => { onClose(); nav.push({ name: 'session', config: { minutes: 10, mode: 'memorizar', focus: `law:${hit.law.id}`, articleIds: [hit.art.id], order: 'linear' } }); }}><IPlay size={16} /> Treinar</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

const DIM_COLOR: Record<string, string> = { literal: '#8e97fd', conceitual: '#f2a65a', prazos: '#5b8def', penas: '#f43f5e', excecoes: '#8b5cf6', aplicacao: '#2bb5a8' };

function GrowthRing({ value, color, label }: { value: number; color: string; label: string }) {
  const C = 2 * Math.PI * 26;
  return (
    <div className="gring">
      <div style={{ position: 'relative', width: 66, height: 66 }}>
        <svg width="66" height="66" viewBox="0 0 66 66" style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
          <circle cx="33" cy="33" r="26" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="7" />
          <circle cx="33" cy="33" r="26" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(C * value) / 100} ${C}`} style={{ transition: 'stroke-dasharray 900ms var(--ease)' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', alignContent: 'center' }}><div className="gring-num">{value}</div><div className="gring-den">/100</div></div>
      </div>
      <div className="gring-label">{label}</div>
    </div>
  );
}

function ProgressTop() {
  const v = useCorpusVersion();
  const minute = Math.floor(useAmbient().now.getTime() / 60_000);
  const stats = useLiveAsync(getStats, [minute]);
  const dims = useLiveAsync(async () => {
    const cards = await db.cards.toArray().catch(() => []);
    const ids = [...new Set(cards.map((c) => c.articleId).filter((x): x is string => !!x))];
    const m = await masteryFor(ids);
    const out: Record<string, number> = {};
    for (const d of DIMS) {
      const xs = [...m.values()].map((a) => a.dims[d.id]).filter((x) => x && x.cards > 0) as { score: number }[];
      out[d.id] = xs.length ? Math.round((xs.reduce((s, x) => s + x.score, 0) / xs.length) * 100) : 0;
    }
    return out;
  }, [v]);
  const totalMin = Math.round((stats?.days ?? []).reduce((s, d) => s + d.ms, 0) / 60000);
  const career = useLiveAsync(getCareer, []);
  const [mood, setMood] = useState(false);
  const { wellbeing } = useSettings();
  return (
    <div className="stack" style={{ gap: 10 }}>
      {career && (
        <div className="card career">
          <Mascot mood={career.rank > 0 ? 'proud' : 'happy'} size={86} />
          <div className="grow">
            <div className="caps">Carreira</div>
            <div className="title-l" style={{ marginTop: 2 }}>{careerLabel(career)}</div>
            <div className="xsmall muted" style={{ marginTop: 2 }}>{RANKS[career.rank].desc}</div>
            <div className="xsmall faint" style={{ marginTop: 2 }}>Pontos por acerto: alternativas 4 · doutrina 7 · várias lacunas 9 · digitação no modo Provar 10</div>
            <div className="progress-track" style={{ marginTop: 10 }}><div className="progress-fill" style={{ width: `${Math.max(3, career.pct * 100)}%` }} /></div>
            <div className="xsmall muted" style={{ marginTop: 6 }}>{career.xp.toLocaleString('pt-BR')} pts{career.next ? ` · faltam ${(career.next.min - career.xp).toLocaleString('pt-BR')} para ${career.next.name}` : ' · topo da carreira'}</div>
          </div>
        </div>
      )}
      <div className="statcard" style={{ background: 'linear-gradient(110deg, #8b5cf6, #8e97fd 55%, #f2a65a)' }}>
        <div className="s-label">Tempo de estudo (últimos dias)</div>
        <div className="s-value"><IClock size={20} /> {totalMin} min</div>
        <span className="s-art"><IGrowth size={64} /></span>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <div className="statcard grow" style={{ background: 'linear-gradient(120deg, #f2665b, #f57c2b 60%, #ffa34d)' }}>
          <div className="s-label">Ofensiva</div><div className="s-value"><IFlame size={20} /> {stats?.streak ?? 0} dias</div>
        </div>
        <div className="statcard grow" style={{ background: 'linear-gradient(120deg, #1f9d8b, #2bb5a8 60%, #5fb83f)' }}>
          <div className="s-label">Em memória</div><div className="s-value"><IBrain size={20} /> {stats?.learned ?? 0}</div>
        </div>
      </div>
      <button className="list-item card tap" style={{ padding: 14 }} onClick={() => nav.push({ name: 'ponto' })}>
        <span className="law-glyph" style={{ ['--tint' as string]: '241, 205, 130' }}><IPunch size={21} /></span>
        <div className="grow"><div style={{ fontWeight: 650 }}>Folha de ponto e liga</div><div className="xsmall muted">Presença diária, liga da semana (Vara → Supremo) e ranking</div></div>
        <IChevR className="chev" />
      </button>
      {wellbeing && <MoodWeek onCheckIn={() => setMood(true)} />}
      <MoodSheet open={mood} onClose={() => setMood(false)} />
      <div className="card">
        <div className="title-m" style={{ marginBottom: 14 }}>Áreas de crescimento</div>
        <div className="rings">
          {DIMS.map((d) => <GrowthRing key={d.id} value={dims?.[d.id] ?? 0} color={DIM_COLOR[d.id] ?? '#8e97fd'} label={d.label} />)}
        </div>
      </div>
    </div>
  );
}
