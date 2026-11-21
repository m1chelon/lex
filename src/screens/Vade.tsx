import { DoutrinaCard } from './DoutrinaCard';
import { motion, type PanInfo } from 'motion/react';
import { TucaLoading } from '../ui/TucaLoading';
import { useEffect, useMemo, useState } from 'react';
import { articleTitle, coverage, ensureLaws, getArticle, getLaw, getLaws, getManifest, lawIdOf } from '../data/corpus';
import { RAMOS, lawsByRamo, getArea } from '../core/areas';
import { Study } from './Study';
import { RAMO_STYLE } from '../ui/ramo';
import type { Ramo } from '../core/sources';
import { db, type MarkRow, type ReviewRow } from '../data/db';
import { SOURCES } from '../core/sources';
import { headingPath } from '../core/edital';
import type { Article, Heading, LawDoc, Unit } from '../core/types';
import { nav } from '../ui/nav';
import { PageHeader, SectionHeader, Sheet, toast, CType, spring, useAsync } from '../ui/primitives';
import { haptic, reducedMotion, useSettings } from '../ui/settings';
import { ArticleView } from '../ui/LawText';
import { openTerm } from '../ui/termStore';
import { IBook, IChevR, IChevD, ISearch, IStar, IHighlight, INote, IPlay, IHistory, IDiff, ILink, IExternal, IChevL, IInfo, IScale } from '../ui/icons';
import { fold } from '../learn/text';
import { wordDiff } from '../learn/diff';
import { termsInArticleText } from '../learn/terms';
import { CONCEPTS } from '../content/concepts';
import { LESSONS } from '../content/lessons';
import { COMPARISONS } from '../content/comparisons';
import { masteryFor, LEVEL_LABEL } from '../learn/mastery';
import { useCorpusVersion } from '../App';
import { lawStyle } from '../ui/ramo';
import { TINT } from '../ui/IconTile';
import { parseArticleQuery, searchArticles, searchCatalog } from '../learn/search';
import { articlesInSection, lawSections } from '../learn/lawSections';

const FIRST_BRANCHES = ['Penal', 'Civil'] as const;
const BROWSE_BRANCHES = [...FIRST_BRANCHES, ...RAMOS.filter((ramo) => ramo !== 'Penal' && ramo !== 'Civil' && !ramo.startsWith('Interna'))]
  .filter((ramo) => lawsByRamo(ramo).length);
const branchTitle = (ramo: Ramo) => ramo === 'Direitos sociais' ? ramo : `Direito ${ramo}`;
const MAIN_CODES: Partial<Record<Ramo, { id: string; name: string }>> = {
  Penal: { id: 'cp', name: 'Código Penal' },
  Civil: { id: 'cc', name: 'Código Civil' },
  'Processual Penal': { id: 'cpp', name: 'Código de Processo Penal' },
  'Processual Civil': { id: 'cpc', name: 'Código de Processo Civil' },
  Constitucional: { id: 'cf', name: 'Constituição Federal' },
  Eleitoral: { id: 'ce', name: 'Código Eleitoral' },
};

export function VadeHome() {
  const [q, setQ] = useState('');
  return (
    <div className="stack tab-content">
      <SectionHeader title="Direito" description="Constituição, códigos e leis por matéria." icon={<span className="section-icon legislation"><IScale /></span>} />
      <form onSubmit={(e) => { e.preventDefault(); nav.push({ name: 'search', q: q.trim() || undefined }); }}>
        <div className="search-field glass">
          <input type="search" name="q" autoComplete="off" placeholder="Ex. art. 37 CF" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar na legislação" enterKeyHint="search" />
          <button className="icon-btn" type="submit" aria-label="Buscar"><ISearch size={18} /></button>
        </div>
      </form>
      <section className="stack" aria-labelledby="vade-branches">
      <h2 id="vade-branches" className="title-m">Matérias</h2>
      <div className="branch-grid">
        {BROWSE_BRANCHES.map((ramo) => {
          const style = RAMO_STYLE[ramo];
          return <button className="branch-card" key={ramo} onClick={() => { haptic('tap'); nav.push({ name: 'ramo', ramo }); }}>
            <span className={`law-glyph${ramo === 'Civil' ? ' civil-glyph' : ''}`} style={{ ['--tint' as string]: TINT[style.color] }}>{style.icon(21)}</span>
            <span className="branch-name"><strong>{branchTitle(ramo)}</strong><IChevR size={15} /></span>
          </button>;
        })}
      </div>
      </section>
      <div className="list">
        <button className="list-item" onClick={() => nav.push({ name: 'favorites' })}><IStar style={{ color: 'var(--gold)' }} /><span className="grow">Favoritos, destaques e anotações</span><IChevR className="chev" /></button>
        <button className="list-item" onClick={() => nav.push({ name: 'biblioteca' })}><IBook style={{ color: 'var(--gold)' }} /><span className="grow">Biblioteca de estudo</span><IChevR className="chev" /></button>
      </div>
    </div>
  );
}

export function LawLibraryScreen() {
  return <div className="stack"><PageHeader title="Biblioteca de estudo" /><Study embedded /></div>;
}

export function RamoScreen({ ramo }: { ramo: Ramo }) {
  useCorpusVersion();
  const main = MAIN_CODES[ramo];
  const law = main && getLaw(main.id);
  const manifest = getManifest();
  const ids = lawsByRamo(ramo);
  const sections = law ? lawSections(law) : [];
  useEffect(() => { if (main) void ensureLaws([main.id]); }, [main]);
  const otherLaws = ids.filter((id) => id !== main?.id);
  return <div className="stack ramo-screen">
    <PageHeader title={branchTitle(ramo)} />
    <button className="btn btn-primary btn-block" onClick={() => nav.push({ name: 'jogar', scope: { kind: 'geral', ramo } })}><IPlay size={17} /> Treinar esta matéria</button>
    {main && <section className="stack branch-code" aria-label={main.name}>
      <h2 className="title-m">{main.name}</h2>
      {!!sections.length && <div className="branch-grid">
        {sections.map(({ id, title, label }) =>
          <button key={id} className="branch-card branch-heading" onClick={() => nav.push({ name: 'law', id: main.id, headingId: id })}>
            {label && <small>{label}</small>}<strong>{title}</strong>
          </button>)}
      </div>}
      <button className="btn btn-quiet" onClick={() => nav.push({ name: 'law', id: main.id })}><IBook size={17} /> Ler na íntegra</button>
    </section>}
    {!!otherLaws.length && <section className="stack">
      <h2 className="title-m">{main ? 'Outras normas' : 'Normas'}</h2>
      <div className="list">{otherLaws.map((id) => {
        const source = SOURCES.find((item) => item.id === id)!;
        const style = lawStyle(id);
        const doc = getLaw(id);
        const meta = manifest?.laws.find((entry) => entry.id === id);
        const available = !!doc || meta?.status === 'ok';
        const outOfDate = doc?.articles.filter(({ outdated }) => outdated?.length).length ?? 0;
        return <button key={id} className="list-item ramo-law" onClick={() => nav.push(available ? { name: 'law', id } : { name: 'admin' })}>
          <span className="law-glyph" style={{ ['--tint' as string]: TINT[style.color] }}>{style.icon(19)}</span>
          <span className="grow"><strong>{source.short}</strong><small className="muted">{source.title}</small>
            {!available && <small className="warn">Aguardando importação</small>}
            {!!outOfDate && <small className="warn">{outOfDate} artigos com alteração pendente</small>}
          </span><IChevR className="chev" />
        </button>;
      })}</div>
    </section>}
  </div>;
}

function HeadingTree({ law, roots, onPick }: { law: LawDoc; roots?: string[]; onPick: (a: Article) => void }) {
  const cov = coverage();
  const [open, setOpen] = useState<Set<string>>(new Set());
  const byParent = useMemo(() => {
    const m = new Map<string | undefined, Heading[]>();
    for (const h of law.headings) m.set(h.parent, [...(m.get(h.parent) || []), h]);
    return m;
  }, [law]);
  const artsBy = useMemo(() => {
    const m = new Map<string | undefined, Article[]>();
    for (const a of law.articles) m.set(a.h, [...(m.get(a.h) || []), a]);
    return m;
  }, [law]);
  const countReq = (h: Heading): number => (artsBy.get(h.id) || []).filter((a) => cov.required.has(a.id)).length + (byParent.get(h.id) || []).reduce((s, c) => s + countReq(c), 0);
  const render = (parent: string | undefined, depth: number, subset?: Set<string>): JSX.Element[] => {
    const out: JSX.Element[] = [];
    for (const a of subset ? [] : artsBy.get(parent) || []) {
      out.push(
        <button key={a.id} className="list-item" style={{ paddingLeft: 16 + depth * 12, minHeight: 48 }} onClick={() => onPick(a)}>
          <div className="grow small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <strong style={{ color: a.rev ? 'var(--text-3)' : 'var(--text)' }}>{a.lab}</strong>{a.rub ? <span className="gold"> · {a.rub}</span> : null}{' '}
            <span className="muted">{a.units[0]?.t.slice(0, 80)}</span>
          </div>
          {cov.required.has(a.id) && <span className="badge badge-gold">edital</span>}
        </button>,
      );
    }
    for (const h of (byParent.get(parent) || []).filter(({ id }) => !subset || subset.has(id))) {
      const isOpen = open.has(h.id);
      const req = countReq(h);
      out.push(
        <button key={h.id} className="list-item" style={{ paddingLeft: 16 + depth * 12 }} aria-expanded={isOpen} onClick={() => { haptic('soft'); const n = new Set(open); isOpen ? n.delete(h.id) : n.add(h.id); setOpen(n); }}>
          <IChevD size={16} style={{ transform: isOpen ? undefined : 'rotate(-90deg)', transition: 'transform 200ms', color: 'var(--text-3)', flex: 'none' }} />
          <div className="grow">
            <div className="xsmall caps" style={{ fontSize: 10.5 }}>{h.label}</div>
            <div className="small" style={{ fontWeight: 600 }}>{h.title}</div>
          </div>
          {req > 0 && <span className="badge badge-gold">{req}</span>}
        </button>,
      );
      if (isOpen) out.push(...render(h.id, depth + 1));
    }
    return out;
  };
  return <div className="list">{roots?.length === 1 ? render(roots[0], 0) : render(undefined, 0, roots ? new Set(roots) : undefined)}</div>;
}

function useLawDownload(id: string, available: boolean) {
  const [attempt, setAttempt] = useState(0);
  const [complete, setComplete] = useState(false);
  useEffect(() => {
    if (available) return;
    let active = true;
    setComplete(false);
    void ensureLaws([id]).catch(() => {}).finally(() => { if (active) setComplete(true); });
    return () => { active = false; };
  }, [id, available, attempt]);
  return { complete, retry: () => { setComplete(false); setAttempt(attempt + 1); } };
}

export function LawScreen({ id, headingId }: { id: string; headingId?: string }) {
  useCorpusVersion();
  const settings = useSettings();
  const law = getLaw(id);
  const cov = coverage();
  const [onlyReq, setOnlyReq] = useState<boolean>();
  const download = useLawDownload(id, !!law);
  if (!law) return <div className="stack"><PageHeader title="Lei indisponível" />
    {download.complete ? <><div className="empty">Esta norma ainda não está disponível no aparelho.</div><button className="btn btn-quiet" onClick={download.retry}>Tentar baixar novamente</button></> : <TucaLoading msg="Baixando a norma" />}
  </div>;
  const reqArts = law.articles.filter((a) => cov.required.has(a.id));
  const section = headingId ? lawSections(law).find((entry) => entry.id === headingId) : undefined;
  const sectionArticles = section ? articlesInSection(law, section) : [];
  const showRequired = !section && (onlyReq ?? reqArts.length > 0);
  return (
    <div className="stack" style={{ gap: 14 }}>
      <PageHeader title={section?.title ?? law.short} sub={law.title} right={<button className="icon-btn glass" aria-label="Buscar nesta lei" onClick={() => nav.push({ name: 'search', lawId: id })}><ISearch /></button>} />
      {section ? <div className="row branch-actions">
        <button className="btn btn-primary" disabled={!sectionArticles.length} onClick={() => nav.push({ name: 'session', config: {
          area: 'geral', focus: 'law:' + id, title: section.title, mode: 'memorizar', order: 'linear', minutes: settings.dailyMinutes, articleIds: sectionArticles,
        } })}><IPlay size={17} /> Treinar esta parte</button>
        <button className="btn btn-quiet" onClick={() => { setOnlyReq(false); nav.replace({ name: 'law', id }); }}>Ler na íntegra</button>
      </div> : <button className="btn btn-primary btn-block" style={{ minHeight: 52 }} onClick={() => { haptic('ok'); const src = SOURCES.find((x) => x.id === id); nav.push({ name: 'jogar', scope: { kind: 'geral', ramo: src?.ramo ?? 'Constitucional', law: id } }); }}><IPlay size={17} /> Treinar esta lei</button>}
      <div className="card">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}><CType k="oficial" /><span className="badge badge-muted">{law.provenance.method === 'manual' ? 'importação manual' : 'importação automática'}</span></div>
        <p className="xsmall muted" style={{ marginTop: 8, lineHeight: 1.5 }}>{law.provenance.sourceName}<br />{law.provenance.versionLabel}<br />Importado em {new Date(law.provenance.retrievedAt).toLocaleDateString('pt-BR')} · SHA-256 {law.provenance.sha256.slice(0, 12)}…</p>
        <a className="small row" style={{ gap: 4, marginTop: 8 }} href={law.provenance.sourceUrl} target="_blank" rel="noreferrer">Abrir fonte oficial <IExternal size={13} /></a>
      </div>
      {!section && reqArts.length > 0 && (
        <div className="chips">
          <button className="chip" aria-pressed={showRequired} onClick={() => setOnlyReq(true)}>Exigidos no edital ({reqArts.length})</button>
          <button className="chip" aria-pressed={!showRequired} onClick={() => setOnlyReq(false)}>Íntegra ({law.articles.length})</button>
        </div>
      )}
      {showRequired && reqArts.length > 0 ? (
        <div className="list">
          {reqArts.map((a) => {
            const path = headingPath(law, a).map((h) => h.label).join(' › ');
            return (
              <button key={a.id} className="list-item" onClick={() => nav.push({ name: 'article', id: a.id })}>
                <div className="grow small"><strong>{a.lab}</strong>{a.rub ? <span className="gold"> · {a.rub}</span> : null}<div className="xsmall muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</div></div>
                <IChevR className="chev" />
              </button>
            );
          })}
          {!reqArts.length && <div className="empty small">Nenhum artigo desta lei é exigido no edital — ela integra a biblioteca auxiliar.</div>}
        </div>
      ) : <HeadingTree key={headingId} law={law} roots={section?.roots} onPick={(a) => nav.push({ name: 'article', id: a.id })} />}
    </div>
  );
}

function crossRefs(law: LawDoc, art: Article): Article[] {
  const nums = new Set<string>();
  for (const u of art.units) for (const m of u.t.matchAll(/\bart(?:igo)?s?\.?\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:\s*[º°])?(?:-([A-Z]))?(?![\d])/gi)) {
    const tail = u.t.slice(m.index! + m[0].length, m.index! + m[0].length + 40);
    if (/^\s*(d[aoe]s?|desta|deste)\s+(lei|c[óo]digo|constitui|resolu|decreto)/i.test(tail) && !/desta lei|deste c[óo]digo|deste estatuto|destas normas|desta resolu/i.test(tail)) continue;
    nums.add(m[1].replace(/\./g, '') + (m[2] ? `-${m[2].toUpperCase()}` : ''));
  }
  return [...nums].map((n) => law.articles.find((a) => a.n === n)).filter((a): a is Article => !!a && a.id !== art.id).slice(0, 8);
}

export function ArticleScreen({ id, unitId }: { id: string; unitId?: string }) {
  useCorpusVersion();
  const hit = getArticle(id);
  const download = useLawDownload(lawIdOf(id), !!hit || !!getLaw(lawIdOf(id)));
  const [marks, setMarks] = useState<MarkRow[]>([]);
  const [sel, setSel] = useState<Unit | null>(null);
  const [noteFor, setNoteFor] = useState<Unit | null>(null);
  const [noteText, setNoteText] = useState('');
  const [versions, setVersions] = useState(false);
  const [history, setHistory] = useState<ReviewRow[]>([]);
  const mastery = useAsync(() => masteryFor([id]), [id]);
  const cov = coverage();

  const reload = () => db.marks.where('articleId').equals(id).toArray().then(setMarks).catch(() => {});
  useEffect(() => { void reload(); db.reviews.where('articleId').equals(id).reverse().sortBy('at').then(setHistory).catch(() => {}); }, [id]); // eslint-disable-line
  useEffect(() => {
    if (!unitId || !hit) return;
    const timer = setTimeout(() => document.getElementById(`u-${unitId}`)?.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' }), 350);
    return () => clearTimeout(timer);
  }, [unitId, hit]);

  if (!hit) return <div className="stack"><PageHeader title="Artigo" />
    {getLaw(lawIdOf(id)) ? <div className="empty">Artigo não encontrado na versão da lei disponível.</div>
      : download.complete ? <><div className="empty">A lei deste artigo ainda não está disponível no aparelho.</div><button className="btn btn-quiet" onClick={download.retry}>Tentar baixar novamente</button></>
      : <TucaLoading msg="Baixando a norma" />}
  </div>;
  const { law, art } = hit;
  const idx = law.articles.indexOf(art);
  const prev = law.articles[idx - 1], next = law.articles[idx + 1];
  const fav = marks.some((m) => m.kind === 'fav' && m.target === art.id);
  const hls = new Set(marks.filter((m) => m.kind === 'hl').map((m) => m.target));
  const notes = marks.filter((m) => m.kind === 'note');
  const related = crossRefs(law, art);
  const terms = termsInArticleText(art.units.map((u) => u.t));
  const concepts = CONCEPTS.filter((c) => c.refs.some((r) => `${r.law}.${r.art}` === art.id));
  const lessons = LESSONS.filter((l) => l.refs.some((r) => `${r.law}.${r.art}` === art.id) || l.slides.some((s) => s.blocos.some((b) => b.tipo === 'lei' && `${b.ref.law}.${b.ref.art}` === art.id)));
  const comps = COMPARISONS.filter((c) => c.refs.some((r) => `${r.law}.${r.art}` === art.id));
  const reqs = cov.items.filter(({ req }) => cov.byArticle.get(art.id)?.includes(req.id)).map(({ req }) => req);
  const old = art.units.filter((u) => u.old?.length);
  const original = law.versions?.[0]?.articles.find((a) => a.n === art.n);
  const m = mastery?.get(art.id);
  const errors = history.filter((h) => !h.correct);

  const toggleFav = async () => {
    haptic('tap');
    try {
      if (fav) await db.marks.delete(`fav:${art.id}`); else await db.marks.put({ id: `fav:${art.id}`, kind: 'fav', target: art.id, articleId: art.id, at: Date.now() });
      toast(fav ? 'Removido dos favoritos' : 'Artigo favoritado'); void reload();
    } catch { toast('Não foi possível salvar'); }
  };
  const toggleHl = async (u: Unit) => {
    const k = `hl:${u.id}`;
    if (hls.has(u.id)) await db.marks.delete(k); else await db.marks.put({ id: k, kind: 'hl', target: u.id, articleId: art.id, at: Date.now() });
    haptic('soft'); setSel(null); void reload();
  };
  const saveNote = async () => {
    if (!noteFor) return;
    const k = `note:${noteFor.id}`;
    if (noteText.trim()) await db.marks.put({ id: k, kind: 'note', target: noteFor.id, articleId: art.id, text: noteText.trim(), at: Date.now() });
    else await db.marks.delete(k);
    setNoteFor(null); setNoteText(''); void reload(); toast('Anotação salva');
  };
  const train = () => { haptic('ok'); nav.push({ name: 'session', config: { minutes: 10, mode: 'memorizar', focus: law.id, articleIds: [art.id], title: articleTitle(law.id, art) } }); };

  return (
    <motion.div className="stack" style={{ gap: 14 }}
      onPanEnd={(_e: unknown, i: PanInfo) => { if (i.offset.x < -110 && Math.abs(i.offset.y) < 60 && next) { haptic('soft'); nav.replace({ name: 'article', id: next.id }); } }}>
      <PageHeader title={articleTitle(law.id, art)} sub={headingPath(law, art).map((h) => `${h.label} ${h.title}`).join(' › ')}
        right={<button className="icon-btn glass" aria-label={fav ? 'Remover dos favoritos' : 'Favoritar artigo'} onClick={toggleFav} style={{ color: fav ? 'var(--gold)' : undefined }}><IStar filled={fav} /></button>} />

      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        <CType k="oficial" />
        {reqs.length ? <span className="badge badge-gold">Exigido no edital</span> : <span className="badge badge-muted">Biblioteca auxiliar (fora do edital)</span>}
        {m && <span className="badge badge-muted">{LEVEL_LABEL[m.level]}</span>}
      </div>

      <article className="law-art">
        <ArticleView art={art} onTerm={openTerm} highlights={hls} selectedUnit={sel?.id ?? unitId} onUnitTap={(u) => { haptic('soft'); setSel(sel?.id === u.id ? null : u); }} />
        {notes.length > 0 && <div className="divider" />}
        {notes.map((n) => {
          const u = art.units.find((x) => x.id === n.target);
          return <div key={n.id} className="small" style={{ marginTop: 8 }}><span className="badge badge-gold"><INote size={12} /> {u?.k === 'caput' ? 'caput' : u?.lab}</span> <span style={{ color: 'var(--text)' }}>{n.text}</span></div>;
        })}
        <div className="xsmall faint" style={{ marginTop: 12 }}>{law.provenance.sourceName} · {law.provenance.versionLabel}</div>
      </article>

      <details className="contest-panel doctrine-commentary">
        <summary>Consultar comentário doutrinário</summary>
        <DoutrinaCard articleId={art.id} unitId={unitId} />
      </details>

      {sel && (
        <motion.div className="glass row" style={{ borderRadius: 20, padding: 6, gap: 4, position: 'sticky', bottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 18px)', zIndex: 4 }} initial={reducedMotion() ? false : { y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring}>
          <button className="btn btn-sm grow" onClick={() => toggleHl(sel)}><IHighlight size={17} /> {hls.has(sel.id) ? 'Remover' : 'Destacar'}</button>
          <button className="btn btn-sm grow" onClick={() => { setNoteFor(sel); setNoteText(notes.find((n) => n.target === sel.id)?.text || ''); }}><INote size={17} /> Anotar</button>
          <button className="btn btn-sm grow" onClick={() => { void navigator.clipboard?.writeText(`${sel.k === 'caput' ? art.lab : sel.lab} ${sel.t} (${articleTitle(law.id, art)})`).then(() => toast('Copiado')).catch(() => {}); setSel(null); }}>Copiar</button>
        </motion.div>
      )}

      <button className="btn btn-primary btn-block" onClick={train} style={{ minHeight: 56 }}><IPlay size={17} /> Treinar este artigo</button>

      {m && (
        <div className="card">
          <div className="row between"><div className="title-s">Seu domínio</div><span className="small muted">{LEVEL_LABEL[m.level]}</span></div>
          <div className="stack" style={{ gap: 8, marginTop: 10 }}>
            {Object.entries(m.dims).filter(([, d]) => d!.applicable || d!.cards).map(([k, d]) => (
              <div key={k} className="dimbar"><span className="muted">{{ literal: 'Literalidade', conceitual: 'Conceitos', prazos: 'Prazos', penas: 'Penas', excecoes: 'Exceções', aplicacao: 'Aplicação' }[k]}</span>
                <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.round(d!.score * 100)}%` }} /></div><span className="xsmall muted" style={{ textAlign: 'right' }}>{Math.round(d!.score * 100)}%</span></div>
            ))}
          </div>
        </div>
      )}

      {(errors.length > 0 || history.length > 0) && (
        <div className="card">
          <div className="row" style={{ gap: 8 }}><IHistory size={18} style={{ color: 'var(--gold)' }} /><div className="title-s">Histórico neste dispositivo</div></div>
          <p className="small muted" style={{ marginTop: 6 }}>{history.length} respostas · {errors.length} erros</p>
          {errors.slice(0, 5).map((e) => (
            <div key={e.id} className="small" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--hair)' }}>
              <span className="badge badge-bad">{new Date(e.at).toLocaleDateString('pt-BR')}</span>{' '}
              {e.expected ? <>Você respondeu <span style={{ color: 'var(--bad)' }}>“{e.given === 'V' ? 'igual à lei' : e.given === 'F' ? 'há alteração' : e.given}”</span>; esperado: <strong>“{e.expected === 'V' ? 'igual à lei' : e.expected === 'F' ? 'há alteração' : e.expected}”</strong></> : <>Erro em exercício ({e.type})</>}
            </div>
          ))}
        </div>
      )}

      {(old.length > 0 || original) && (
        <button className="list-item card tap" style={{ borderRadius: 18, display: 'flex' }} onClick={() => setVersions(true)}>
          <IDiff style={{ color: 'var(--gold)' }} />
          <div className="grow"><div style={{ fontWeight: 620 }}>Comparar redações</div><div className="xsmall muted">{original ? 'Texto original × compilado' : `${old.length} dispositivo(s) com redação anterior`}</div></div>
          <IChevR className="chev" />
        </button>
      )}

      {terms.length > 0 && (
        <section>
          <div className="caps" style={{ margin: '8px 4px' }}>Termos jurídicos neste artigo</div>
          <div className="chips">{terms.map((t) => <button key={t.id} className="chip" onClick={() => openTerm(t.id)}>{t.termo}</button>)}</div>
        </section>
      )}

      {(related.length > 0 || concepts.length > 0 || lessons.length > 0 || comps.length > 0) && (
        <section>
          <div className="caps" style={{ margin: '8px 4px' }}>Relacionados</div>
          <div className="list">
            {related.map((a) => <button key={a.id} className="list-item" onClick={() => nav.push({ name: 'article', id: a.id })}><ILink size={18} style={{ color: 'var(--text-3)' }} /><div className="grow small"><strong>{a.lab}</strong> <span className="muted">— citado no texto</span></div><IChevR className="chev" /></button>)}
            {lessons.map((l) => <button key={l.id} className="list-item" onClick={() => nav.push({ name: 'lesson', id: l.id })}><span className="badge badge-gold">Microaula</span><div className="grow small">{l.titulo}</div><IChevR className="chev" /></button>)}
            {comps.map((c) => <button key={c.id} className="list-item" onClick={() => nav.push({ name: 'compare', id: c.id })}><span className="badge badge-muted">Comparativo</span><div className="grow small">{c.titulo}</div><IChevR className="chev" /></button>)}
            {concepts.length > 0 && <button className="list-item" onClick={() => nav.push({ name: 'concepts', topic: concepts[0].topico })}><span className="badge badge-muted">Interpretação</span><div className="grow small">{concepts.length} exercício(s) conceitual(is)</div><IChevR className="chev" /></button>}
          </div>
        </section>
      )}

      {reqs.length > 0 && <div className="card"><div className="caps" style={{ marginBottom: 6 }}>Previsão no edital</div>{reqs.map((r) => <p key={r.id} className="small" style={{ lineHeight: 1.45 }}>{r.texto}</p>)}</div>}

      <div className="row" style={{ gap: 10 }}>
        {prev && <button className="btn btn-quiet grow btn-sm" onClick={() => nav.replace({ name: 'article', id: prev.id })}><IChevL size={16} /> {prev.lab}</button>}
        {next && <button className="btn btn-quiet grow btn-sm" onClick={() => nav.replace({ name: 'article', id: next.id })}>{next.lab} <IChevR size={16} /></button>}
      </div>

      <Sheet open={!!noteFor} onClose={() => setNoteFor(null)} label="Anotação">
        <div className="title-m" style={{ marginBottom: 10 }}>Anotação · {noteFor?.k === 'caput' ? 'caput' : noteFor?.lab}</div>
        <textarea className="input" autoFocus value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Sua anotação (fica apenas neste aparelho)" />
        <button className="btn btn-primary btn-block" style={{ marginTop: 12 }} onClick={saveNote}>Salvar</button>
      </Sheet>

      <Sheet open={versions} onClose={() => setVersions(false)} label="Comparar redações" tall>
        <div className="title-m">Comparar redações</div>
        <p className="xsmall muted" style={{ margin: '6px 0 14px' }}>Redações anteriores constantes da própria fonte oficial compilada. <span style={{ color: 'var(--bad)' }}>Vermelho</span>: texto suprimido; <span style={{ color: 'var(--ok)' }}>verde</span>: texto acrescido.</p>
        {original && (
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="caps" style={{ marginBottom: 8 }}>{law.versions![0].label} → texto compilado</div>
            {art.units.map((u) => {
              const o = original.units.find((x) => x.lab === u.lab && x.k === u.k);
              if (!o) return <p key={u.id} className="small" style={{ color: 'var(--ok)', marginBottom: 8 }}><strong>{u.lab}</strong> (acrescido) {u.t}</p>;
              if (o.t === u.t) return null;
              return <p key={u.id} className="small" style={{ marginBottom: 8, lineHeight: 1.5 }}><strong>{u.k === 'caput' ? 'Caput' : u.lab}</strong> {wordDiff(o.t, u.t).map((p, i) => <span key={i} style={p.op === 'del' ? { color: 'var(--bad)', textDecoration: 'line-through' } : p.op === 'add' ? { color: 'var(--ok)' } : undefined}>{p.t}</span>)}</p>;
            })}
          </div>
        )}
        {old.map((u) => (
          <div key={u.id} className="card" style={{ marginBottom: 12 }}>
            <div className="caps" style={{ marginBottom: 8 }}>{u.k === 'caput' ? 'Caput' : u.lab}</div>
            {u.old!.map((o, i) => (
              <div key={i} className="small" style={{ lineHeight: 1.5, marginBottom: 6 }}>
                {u.t ? wordDiff(o.t, u.t).map((p, k) => <span key={k} style={p.op === 'del' ? { color: 'var(--bad)', textDecoration: 'line-through' } : p.op === 'add' ? { color: 'var(--ok)' } : undefined}>{p.t}</span>) : <span style={{ color: 'var(--bad)', textDecoration: 'line-through' }}>{o.t}</span>}
              </div>
            ))}
            {u.notes?.length ? <div className="xsmall faint">{u.notes.join(' · ')}</div> : null}
          </div>
        ))}
      </Sheet>
    </motion.div>
  );
}

export function SearchScreen({ q: q0, lawId }: { q?: string; lawId?: string }) {
  const version = useCorpusVersion();
  const [q, setQ] = useState(q0 || '');
  const [facet, setFacet] = useState<'all' | 'laws' | 'courses' | 'contests'>('all');
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(30);
  const query = q.trim();
  const wantsLaws = !!lawId || facet === 'all' || facet === 'laws';
  const exact = useMemo(() => parseArticleQuery(query), [query]);
  useEffect(() => {
    if (query.length < 2 || !wantsLaws || exact?.unknownLaw) { setLoading(false); return; }
    const manifest = getManifest();
    const id = lawId ?? exact?.lawId;
    const ids = (id ? [id] : manifest?.laws.filter((law) => law.status === 'ok').map((law) => law.id) ?? []).filter((key) => !getLaw(key));
    if (!ids.length) { setLoading(false); return; }
    let current = true;
    setLoading(true);
    const timer = setTimeout(() => { void ensureLaws(ids).finally(() => { if (current) setLoading(false); }); }, 280);
    return () => { current = false; clearTimeout(timer); };
  }, [query, wantsLaws, lawId, exact, version]);
  const results = useMemo(() => query.length < 2 || !wantsLaws ? [] : searchArticles(getLaws(lawId ? [lawId] : undefined), query, limit),
    [query, wantsLaws, version, lawId, limit]);
  const catalog = useMemo(() => query.length > 1 && !lawId && !exact ? searchCatalog(query) : null, [query, lawId, exact]);
  const courses = facet === 'all' || facet === 'courses';
  const contests = facet === 'all' || facet === 'contests';
  const hasResults = results.length || (courses && (catalog?.courseResults.length || catalog?.topics.length)) || (contests && catalog?.contestResults.length);
  return (
    <div className="stack" style={{ gap: 14 }}>
      <PageHeader title={lawId ? 'Buscar nesta norma' : 'Buscar no LEX'} />
      <label className="search-field glass"><ISearch size={18} /><input autoFocus type="search" name="q" autoComplete="off"
        placeholder={lawId ? 'Palavra, expressão ou “art. 37”' : 'Artigo, assunto, curso ou concurso'}
        value={q} onChange={(e) => { setQ(e.target.value); setLimit(30); }} aria-label="Termo de busca" enterKeyHint="search" /></label>
      {!lawId && <div className="chips" role="group" aria-label="Tipo de resultado">
        {([['all', 'Tudo'], ['laws', 'Artigos'], ['courses', 'Cursos'], ['contests', 'Concursos']] as const).map(([id, label]) =>
          <button key={id} className="chip" aria-pressed={facet === id} onClick={() => setFacet(id)}>{label}</button>)}
      </div>}
      {!lawId && !query && <div className="chips" aria-label="Sugestões de busca">
        {['art. 37 CF', 'superendividamento', 'TJSP escrevente'].map((entry) => <button key={entry} className="chip" onClick={() => { setQ(entry); setFacet('all'); }}>{entry}</button>)}
      </div>}
      {contests && !!catalog?.contestResults.length && <section className="stack"><h2 className="title-s">Concursos</h2><div className="list">
        {catalog.contestResults.map(({ id, title }) => <button className="list-item" key={id} onClick={() => nav.push({ name: 'curso', id })}><strong className="grow">{title}</strong><IChevR /></button>)}
      </div></section>}
      {courses && !!(catalog?.courseResults.length || catalog?.topics.length) && <section className="stack"><h2 className="title-s">Cursos e temas</h2><div className="list">
        {catalog!.courseResults.map(({ id, title }) => <button className="list-item" key={id} onClick={() => nav.push({ name: 'doutrina-curso', id })}><strong className="grow">{title}</strong><IChevR /></button>)}
        {catalog!.topics.map(({ id, moduleId, title, course }) => <button className="list-item" key={id + ':' + moduleId} onClick={() => nav.push({ name: 'doutrina-curso', id, moduleId })}>
          <span className="grow"><strong>{title}</strong><small className="muted search-result-sub">{course}</small></span><IChevR />
        </button>)}
      </div></section>}
      {!!results.length && <section className="stack"><h2 className="title-s">Artigos</h2><div className="list">
        {results.map(({ law, art, unit, snippet }) => <button className="list-item" key={art.id} onClick={() => nav.push({ name: 'article', id: art.id, unitId: unit?.id })}>
          <div className="grow"><strong>{articleTitle(law.id, art)}{unit && unit.k !== 'caput' ? `, ${unit.lab}` : ''}</strong>
          {snippet && <small className="muted search-result-sub">{snippet}</small>}</div><IChevR />
        </button>)}
      </div>{results.length >= limit && <button className="btn btn-quiet" onClick={() => setLimit(limit + 30)}>Mostrar mais artigos</button>}</section>}
      {loading && <p className="small muted" role="status">Carregando a legislação disponível…</p>}
      {!loading && query.length >= 2 && !hasResults && <p className="empty" role="status">Nenhum resultado para “{query}”.</p>}
    </div>
  );
}

export function FavoritesScreen() {
  const [marks, setMarks] = useState<MarkRow[]>([]);
  useEffect(() => { db.marks.orderBy('at').reverse().toArray().then(setMarks).catch(() => {}); }, []);
  const groups: { title: string; kind: MarkRow['kind'] }[] = [{ title: 'Artigos favoritos', kind: 'fav' }, { title: 'Destaques', kind: 'hl' }, { title: 'Anotações', kind: 'note' }];
  return (
    <div className="stack" style={{ gap: 14 }}>
      <PageHeader title="Favoritos e anotações" sub="Salvos apenas neste aparelho" />
      {groups.map((g) => {
        const list = marks.filter((m) => m.kind === g.kind);
        if (!list.length) return null;
        return (
          <section key={g.kind}>
            <div className="caps" style={{ margin: '6px 4px 8px' }}>{g.title}</div>
            <div className="list">
              {list.map((m) => {
                const a = getArticle(m.articleId || m.target);
                const u = a?.art.units.find((x) => x.id === m.target);
                return (
                  <button key={m.id} className="list-item" onClick={() => a && nav.push({ name: 'article', id: a.art.id, unitId: u?.id })}>
                    <div className="grow">
                      <div className="small" style={{ fontWeight: 620 }}>{a ? articleTitle(a.law.id, a.art) : m.target}{u && u.k !== 'caput' ? `, ${u.lab}` : ''}</div>
                      <div className="xsmall muted" style={{ marginTop: 2 }}>{m.text || u?.t.slice(0, 120) || a?.art.units[0]?.t.slice(0, 120)}</div>
                    </div>
                    <IChevR className="chev" />
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      {!marks.some((mark) => groups.some(({ kind }) => kind === mark.kind)) && <div className="empty">Toque em um dispositivo no Vade Mecum para destacar ou anotar, ou na estrela para favoritar.</div>}
    </div>
  );
}
