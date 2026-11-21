import { useEffect, useState } from 'react';
import { Sheet, CType, Segmented, toast } from '../ui/primitives';
import { closeTerm, openTerm, useOpenTerm } from '../ui/termStore';
import { getTerm } from '../learn/terms';
import { setSettings, useSettings, haptic } from '../ui/settings';
import type { Level, Ref } from '../content/types';
import { db } from '../data/db';
import { getArticle, getLaw } from '../data/corpus';
import { checkRefAgainst } from '../core/verifyRefs';
import { SOURCES } from '../core/sources';
import { nav } from '../ui/nav';
import { IExternal, IStar, IShield, IChevR } from '../ui/icons';
import { useVerification, verItem } from '../data/verification';

export const LEVELS: { id: Level; label: string }[] = [
  { id: 'simples', label: 'Simplificado' },
  { id: 'tecnico', label: 'Técnico' },
  { id: 'concurso', label: 'Concurso' },
];

export function RefLine({ r }: { r: Ref; status?: string }) {
  const src = SOURCES.find((s) => s.id === r.law);
  const status = checkRefAgainst(r, getLaw(r.law)).status; // conferência ao vivo (inclui importações manuais)
  const art = getArticle(`${r.law}.${r.art}`);
  return (
    <div className="row" style={{ alignItems: 'flex-start', padding: '8px 0', borderTop: '1px solid var(--hair)' }}>
      <div className="grow">
        <div className="small" style={{ fontWeight: 620 }}>{src?.short ?? r.law}, art. {r.art}</div>
        {r.quote && <div className="xsmall muted" style={{ marginTop: 2 }}>“{r.quote}”</div>}
        <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {status === 'verificado' && <span className="badge badge-ok"><IShield size={12} /> conferido no texto oficial</span>}
          {status === 'pendente' && <span className="badge badge-warn">aguardando importação da lei</span>}
          {status === 'divergente' && <span className="badge badge-bad">divergência — revisar</span>}
          {src && <a className="badge badge-muted" href={src.url} target="_blank" rel="noreferrer">fonte oficial <IExternal size={11} /></a>}
        </div>
      </div>
      {art && <button className="icon-btn" aria-label="Abrir artigo" onClick={() => { closeTerm(); nav.push({ name: 'article', id: art.art.id }); }}><IChevR /></button>}
    </div>
  );
}

export function TermBody({ id, compact }: { id: string; compact?: boolean }) {
  const t = getTerm(id);
  const { level } = useSettings();
  const ver = useVerification();
  const [fav, setFav] = useState(false);
  useEffect(() => { db.marks.get(`termfav:${id}`).then((m) => setFav(!!m)).catch(() => {}); }, [id]);
  if (!t) return null;
  const vi = verItem(ver, 'termo', t.id);
  const toggleFav = async () => {
    haptic('tap');
    try {
      if (fav) await db.marks.delete(`termfav:${id}`); else await db.marks.put({ id: `termfav:${id}`, kind: 'termfav', target: id, at: Date.now() });
      setFav(!fav); toast(fav ? 'Removido dos favoritos' : 'Termo favoritado');
    } catch { toast('Não foi possível salvar'); }
  };
  return (
    <div className="stack" style={{ gap: 14, paddingBottom: 8 }}>
      <div className="row between">
        <div>
          <div className="caps">{t.area}</div>
          <div className="title-l" style={{ marginTop: 4 }}>{t.termo}</div>
        </div>
        <button className="icon-btn" onClick={toggleFav} aria-label={fav ? 'Remover dos favoritos' : 'Favoritar termo'} style={{ color: fav ? 'var(--gold)' : undefined }}><IStar filled={fav} /></button>
      </div>
      <Segmented label="Nível de explicação" value={level} options={LEVELS} onChange={(l) => setSettings({ level: l })} />
      <div className="card elev">
        <div style={{ marginBottom: 8 }}><CType k={level === 'concurso' ? 'interpretacao' : 'didatico'} extra={LEVELS.find((l) => l.id === level)!.label} /></div>
        <p style={{ fontSize: 16.5, lineHeight: 1.55 }}>{t[level]}</p>
      </div>
      {!compact && (
        <>
          <div className="card">
            <div className="caps" style={{ marginBottom: 8 }}>Exemplo prático</div>
            <CType k="hipotetico" />
            <p style={{ marginTop: 8, lineHeight: 1.5 }}>{t.exemplo.replace(/^Exemplo hipotético:\s*/i, '').replace(/^./, (c) => c.toUpperCase())}</p>
          </div>
          {t.diferencas.length > 0 && (
            <div className="card">
              <div className="caps" style={{ marginBottom: 8 }}>Diferenças</div>
              {t.diferencas.map((d, i) => {
                const other = getTerm(d.com);
                return (
                  <div key={i} style={{ padding: '8px 0', borderTop: i ? '1px solid var(--hair)' : 0 }}>
                    {other ? <button className="small gold" style={{ fontWeight: 650 }} onClick={() => openTerm(other.id)}>× {other.termo}</button> : <div className="small" style={{ fontWeight: 650 }}>× {d.com}</div>}
                    <p className="small" style={{ marginTop: 3, color: 'var(--text)' }}>{d.texto}</p>
                  </div>
                );
              })}
            </div>
          )}
          {t.excecoes && <div className="card"><div className="caps" style={{ marginBottom: 6 }}>Exceções</div><p className="small" style={{ color: 'var(--text)', lineHeight: 1.5 }}>{t.excecoes}</p></div>}
          <div className="card" style={{ borderColor: 'rgba(224,122,111,.25)' }}>
            <div className="caps" style={{ marginBottom: 6, color: 'var(--bad)' }}>Pegadinhas comuns</div>
            {t.pegadinhas.map((p, i) => <p key={i} className="small" style={{ color: 'var(--text)', marginTop: i ? 6 : 0, lineHeight: 1.45 }}>• {p}</p>)}
          </div>
          {t.fundamentacao.length > 0 && (
            <div className="card">
              <div className="caps" style={{ marginBottom: 4 }}>Fundamentação legal</div>
              {t.fundamentacao.map((r, i) => <RefLine key={i} r={r} status={vi?.refs[i]?.status} />)}
            </div>
          )}
          {t.doutrina?.length ? (
            <div className="card">
              <div className="caps" style={{ marginBottom: 6 }}>Doutrina (seu acervo)</div>
              {t.doutrina.map((d, i) => (
                <div key={i} className="small" style={{ lineHeight: 1.45 }}>
                  <div style={{ color: 'var(--text)' }}>“{d.trecho}”</div>
                  <div className="muted" style={{ marginTop: 4 }}>{d.obra}, p. {d.pagina} do PDF {vi?.docs[i]?.status === 'verificado' && <span className="badge badge-ok" style={{ marginLeft: 6 }}>trecho conferido</span>}</div>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export function TermSheet() {
  const id = useOpenTerm();
  return (
    <Sheet open={!!id} onClose={closeTerm} label="Dicionário jurídico" tall>
      {id && <TermBody id={id} />}
    </Sheet>
  );
}
