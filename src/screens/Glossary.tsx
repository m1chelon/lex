import { useEffect, useMemo, useState } from 'react';
import { GLOSSARY } from '../content/glossary';
import { PageHeader } from '../ui/primitives';
import { openTerm } from '../ui/termStore';
import { fold } from '../learn/text';
import { db } from '../data/db';
import { IChevR, ISearch, IStar } from '../ui/icons';
import { useVerification, verItem } from '../data/verification';
import { useSettings } from '../ui/settings';

export function GlossaryScreen() {
  const [q, setQ] = useState('');
  const [onlyFav, setOnlyFav] = useState(false);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const ver = useVerification();
  const { level } = useSettings();
  useEffect(() => { db.marks.where('kind').equals('termfav').toArray().then((m) => setFavs(new Set(m.map((x) => x.target)))).catch(() => {}); }, []);
  const list = useMemo(() => GLOSSARY.filter((t) => (!onlyFav || favs.has(t.id)) && (!q || fold(t.termo + ' ' + t.variantes.join(' ') + ' ' + t.simples).includes(fold(q)))).sort((a, b) => a.termo.localeCompare(b.termo, 'pt-BR')), [q, onlyFav, favs]);
  const areas = [...new Set(list.map((t) => t.area))];
  return (
    <div className="stack" style={{ gap: 14 }}>
      <PageHeader title="Dicionário jurídico" sub={`${GLOSSARY.length} termos verificados · vinculados automaticamente ao texto legal`} />
      <label className="search-field glass"><ISearch size={18} /><input placeholder="Buscar termo" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar termo" /></label>
      <div className="chips"><button className="chip" aria-pressed={onlyFav} onClick={() => setOnlyFav(!onlyFav)}><IStar size={15} filled={onlyFav} /> Favoritos</button></div>
      {areas.map((a) => (
        <section key={a}>
          <div className="caps" style={{ margin: '10px 4px 8px' }}>{a}</div>
          <div className="list">
            {list.filter((t) => t.area === a).map((t) => {
              const st = verItem(ver, 'termo', t.id)?.status;
              return (
                <button key={t.id} className="list-item" onClick={() => openTerm(t.id)}>
                  <div className="grow">
                    <div className="row" style={{ gap: 8 }}><span style={{ fontWeight: 640 }}>{t.termo}</span>{favs.has(t.id) && <IStar size={13} filled style={{ color: 'var(--gold)' }} />}</div>
                    <div className="xsmall muted" style={{ marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t[level]}</div>
                    {st === 'pendente' && <span className="badge badge-warn" style={{ marginTop: 6 }}>fundamentação aguarda importação</span>}
                  </div>
                  <IChevR className="chev" />
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {!list.length && <div className="empty">Nenhum termo encontrado.</div>}
    </div>
  );
}
