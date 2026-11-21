// Painel administrativo: fontes, pendências, importação manual, cobertura do edital e integridade.
import { useState } from 'react';
import { SOURCES, EDITAL, type SourceDef } from '../core/sources';
import { importEsajJson, importHtmlSource } from '../core/importers';
import { REQUIREMENTS, resolveRequirement, describe } from '../core/edital';
import { checkRefAgainst } from '../core/verifyRefs';
import type { LawDoc } from '../core/types';
import { coverage, getLaw, getManifest, removeLaw, storeManualLaw } from '../data/corpus';
import { clearPools } from '../learn/generators';
import { GLOSSARY } from '../content/glossary';
import { CONCEPTS } from '../content/concepts';
import { LESSONS } from '../content/lessons';
import { COMPARISONS } from '../content/comparisons';
import { useVerification } from '../data/verification';
import { PageHeader, Sheet, toast, CType } from '../ui/primitives';
import { IExternal, IUpload, IShield, IInfo, IChevD } from '../ui/icons';
import { useCorpusVersion } from '../App';

function allRefs() {
  return [
    ...GLOSSARY.flatMap((t) => t.fundamentacao), ...CONCEPTS.flatMap((c) => c.refs), ...LESSONS.flatMap((l) => [...l.refs, ...l.slides.flatMap((s) => s.blocos.flatMap((b) => (b.tipo === 'lei' ? [b.ref] : [])))]), ...COMPARISONS.flatMap((c) => c.refs),
  ];
}

function SourceRow({ s, onImport }: { s: SourceDef; onImport: (s: SourceDef) => void }) {
  const law = getLaw(s.id);
  const m = getManifest()?.laws.find((x) => x.id === s.id);
  const [open, setOpen] = useState(false);
  const cov = coverage();
  const items = cov.items.filter((i) => i.req.law === s.id);
  const warnings = law?.stats.warnings ?? [];
  return (
    <div className="card" style={{ padding: 14 }}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <div className="grow">
          <div className="row" style={{ gap: 8 }}><strong>{s.short}</strong>{law ? <span className="badge badge-ok">{law.provenance.method === 'manual' ? 'importado manualmente' : 'importado e validado'}</span> : <span className="badge badge-warn">pendente</span>}</div>
          <div className="xsmall muted" style={{ marginTop: 3 }}>{s.title}</div>
        </div>
        <button className="icon-btn" aria-label="Detalhes" aria-expanded={open} onClick={() => setOpen(!open)}><IChevD style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }} /></button>
      </div>
      {!law && m?.error && <p className="xsmall" style={{ color: 'var(--warn)', marginTop: 8 }}>{m.error}</p>}
      {law && <p className="xsmall muted" style={{ marginTop: 8, lineHeight: 1.5 }}>{law.articles.length} artigos · {law.stats.units} dispositivos · cobertura de caracteres {law.stats.sourceChars === law.stats.outputChars ? '100%' : `${((law.stats.outputChars / law.stats.sourceChars) * 100).toFixed(2)}%`}<br />{law.provenance.versionLabel}<br />Obtido em {new Date(law.provenance.retrievedAt).toLocaleString('pt-BR')} · SHA-256 {law.provenance.sha256.slice(0, 16)}… · parser {law.provenance.parserVersion}</p>}
      {open && (
        <div className="stack" style={{ gap: 8, marginTop: 10 }}>
          {items.map((it) => (
            <div key={it.req.id} className="xsmall" style={{ lineHeight: 1.45 }}>
              <strong>{it.req.topico}:</strong> {it.articles.length} artigos exigidos {it.missing.length ? <span style={{ color: 'var(--warn)' }}>· lacunas: {it.missing.join('; ')}</span> : <span style={{ color: 'var(--ok)' }}>· sem lacunas</span>}
              {it.lettered.length > 0 && <div className="faint">Incluídos por estarem dentro da faixa: arts. {it.lettered.join(', ')}</div>}
            </div>
          ))}
          {warnings.length > 0 && <details className="xsmall muted"><summary>{warnings.length} aviso(s) do importador</summary>{warnings.map((w, i) => <p key={i} style={{ marginTop: 4 }}>• {w}</p>)}</details>}
          {law?.unplaced?.length ? <details className="xsmall muted"><summary>{law.unplaced.length} redação(ões) anterior(es) fora de artigos</summary>{law.unplaced.map((w, i) => <p key={i} style={{ marginTop: 4 }}>• {w}</p>)}</details> : null}
        </div>
      )}
      <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <a className="btn btn-sm btn-quiet" href={s.url} target="_blank" rel="noreferrer">{s.kind === 'senado' ? 'Ver no normas.leg.br' : 'Fonte oficial'} <IExternal size={13} /></a>
        {s.planaltoUrl && <a className="btn btn-sm btn-quiet" href={s.planaltoUrl} target="_blank" rel="noreferrer">Ver no Planalto <IExternal size={13} /></a>}
        {(s.kind === 'planalto' || s.kind === 'senado' || s.kind === 'alesp' || s.kind === 'esaj') && <button className="btn btn-sm btn-ghost" onClick={() => onImport(s)}><IUpload size={15} /> Importar arquivo</button>}
        {law?.provenance.method === 'manual' && <button className="btn btn-sm btn-quiet" onClick={async () => { await removeLaw(s.id); toast('Importação manual removida'); }}>Desfazer importação manual</button>}
      </div>
    </div>
  );
}

export function AdminScreen() {
  useCorpusVersion();
  const [target, setTarget] = useState<SourceDef | null>(null);
  const [preview, setPreview] = useState<LawDoc | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ver = useVerification();
  const cov = coverage();
  const refs = allRefs();
  const live = refs.map((r) => checkRefAgainst(r, getLaw(r.law)));
  const liveTot = { verificado: live.filter((x) => x.status === 'verificado').length, pendente: live.filter((x) => x.status === 'pendente').length, divergente: live.filter((x) => x.status === 'divergente').length };
  const gaps = cov.items.filter((i) => i.missing.length);

  const onFile = async (f: File) => {
    if (!target) return;
    setBusy(true); setErr(null); setPreview(null);
    try {
      const bytes = new Uint8Array(await f.arrayBuffer());
      const doc = target.kind === 'esaj' ? await importEsajJson(target, bytes, 'manual', new Date().toISOString()) : await importHtmlSource(target, bytes, 'manual', new Date().toISOString());
      if (doc.articles.length < 3) throw new Error('Poucos artigos reconhecidos — confira se o arquivo é a página correta.');
      setPreview(doc);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Falha na leitura do arquivo'); }
    setBusy(false);
  };
  const confirm = async () => {
    if (!preview) return;
    await storeManualLaw(preview); clearPools(preview.id);
    toast(`${preview.short} importado e validado`); setPreview(null); setTarget(null);
  };
  const previewCov = preview ? REQUIREMENTS.filter((r) => r.law === preview.id).map((r) => resolveRequirement(preview, r)) : [];
  const previewRefs = preview ? refs.filter((r) => r.law === preview.id).map((r) => ({ r, ...checkRefAgainst(r, preview) })) : [];

  return (
    <div className="stack" style={{ gap: 14 }}>
      <PageHeader title="Fontes e integridade" sub="Painel administrativo" />
      <div className="card">
        <div className="caps">Edital de referência</div>
        <div className="small" style={{ fontWeight: 650, marginTop: 4 }}>{EDITAL.title}</div>
        <p className="xsmall muted" style={{ marginTop: 4, lineHeight: 1.45 }}>{EDITAL.orgao}<br />{EDITAL.publicacao}<br />{EDITAL.regra}</p>
        <a className="small row" style={{ gap: 4, marginTop: 8 }} href={EDITAL.url} target="_blank" rel="noreferrer">Abrir no DJE <IExternal size={13} /></a>
      </div>

      <div className="card">
        <div className="row" style={{ gap: 8 }}><IInfo style={{ color: gaps.length ? 'var(--warn)' : 'var(--ok)' }} /><div className="title-s">Lacunas na cobertura do edital</div></div>
        {gaps.length ? gaps.map((g) => <p key={g.req.id} className="xsmall" style={{ marginTop: 8, lineHeight: 1.45 }}><strong>{g.req.topico}</strong> ({getLaw(g.req.law)?.short ?? g.req.law}): {g.missing.join('; ')}</p>) : <p className="small muted" style={{ marginTop: 6 }}>Nenhuma lacuna: todos os itens do Anexo VIII foram localizados nas fontes importadas.</p>}
        <p className="xsmall faint" style={{ marginTop: 10 }}>Itens conferidos: {REQUIREMENTS.length} tópicos, {REQUIREMENTS.reduce((n, r) => n + r.sel.length, 0)} seletores ({REQUIREMENTS.flatMap((r) => r.sel.map(describe)).slice(0, 3).join(', ')}, …).</p>
      </div>

      <div className="card">
        <div className="row" style={{ gap: 8 }}><IShield style={{ color: 'var(--gold)' }} /><div className="title-s">Integridade do conteúdo didático</div></div>
        <p className="small" style={{ marginTop: 8 }}><span style={{ color: 'var(--ok)' }}>{liveTot.verificado} referências conferidas</span> no texto oficial · <span style={{ color: 'var(--warn)' }}>{liveTot.pendente} aguardando importação</span> · <span style={{ color: liveTot.divergente ? 'var(--bad)' : 'var(--text-2)' }}>{liveTot.divergente} divergentes</span></p>
        {ver && <p className="xsmall muted" style={{ marginTop: 4 }}>{ver.totals.doutrinaVerificada} referência(s) doutrinária(s) conferida(s) página a página no acervo durante o build.</p>}
        {live.map((x, i) => x.status === 'divergente' ? <p key={i} className="xsmall" style={{ color: 'var(--bad)', marginTop: 6 }}>• {refs[i].law}, art. {refs[i].art}: {x.detail}</p> : null)}
        <p className="xsmall faint" style={{ marginTop: 8 }}>Cada definição, microaula, comparativo e exercício cita dispositivos com trechos literais que são conferidos automaticamente contra a versão importada da lei.</p>
      </div>

      <div className="caps" style={{ margin: '6px 4px 0' }}>Fontes oficiais</div>
      {SOURCES.map((s) => <SourceRow key={s.id} s={s} onImport={(x) => { setTarget(x); setPreview(null); setErr(null); }} />)}

      <Sheet open={!!target} onClose={() => { setTarget(null); setPreview(null); }} label="Importação manual" tall>
        {target && (
          <div className="stack" style={{ gap: 12 }}>
            <div className="title-m">Importar {target.short}</div>
            <p className="small muted" style={{ lineHeight: 1.5 }}>{target.manualHint}</p>
            <a className="btn btn-quiet btn-sm" href={target.kind === 'esaj' ? `https://esaj.tjsp.jus.br/gcn-services/api/publico/legislacao/find/${target.esajId}` : target.planaltoUrl ?? target.url} target="_blank" rel="noreferrer" style={{ alignSelf: 'flex-start' }}>1. Abrir a fonte oficial <IExternal size={13} /></a>
            <label className="btn btn-ghost" style={{ cursor: 'pointer' }}><IUpload size={17} /> 2. Escolher o arquivo salvo<input type="file" accept=".htm,.html,.json,text/html,application/json" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} /></label>
            {busy && <p className="small muted">Lendo e estruturando…</p>}
            {err && <p className="small" style={{ color: 'var(--bad)' }}>{err}</p>}
            {preview && (
              <div className="card stack" style={{ gap: 8 }}>
                <CType k="oficial" extra="pré-visualização" />
                <p className="small">{preview.articles.length} artigos · {preview.stats.units} dispositivos · {preview.stats.revoked} revogados</p>
                <p className="xsmall muted">Cobertura de caracteres: {preview.stats.outputChars}/{preview.stats.sourceChars} · SHA-256 {preview.provenance.sha256.slice(0, 16)}…</p>
                {previewCov.map((c) => <p key={c.req.id} className="xsmall" style={{ lineHeight: 1.45 }}><strong>{c.req.topico}:</strong> {c.articles.length} artigos exigidos {c.missing.length ? <span style={{ color: 'var(--warn)' }}>· lacunas: {c.missing.join('; ')}</span> : <span style={{ color: 'var(--ok)' }}>· completo</span>}</p>)}
                {previewRefs.length > 0 && <p className="xsmall">Referências didáticas: <span style={{ color: 'var(--ok)' }}>{previewRefs.filter((x) => x.status === 'verificado').length} conferidas</span>{previewRefs.some((x) => x.status === 'divergente') && <span style={{ color: 'var(--bad)' }}> · {previewRefs.filter((x) => x.status === 'divergente').length} divergentes</span>}</p>}
                {previewRefs.filter((x) => x.status === 'divergente').slice(0, 6).map((x, i) => <p key={i} className="xsmall" style={{ color: 'var(--bad)' }}>• art. {x.r.art}: {x.detail}</p>)}
                {preview.stats.warnings.length > 0 && <details className="xsmall muted"><summary>{preview.stats.warnings.length} aviso(s)</summary>{preview.stats.warnings.slice(0, 40).map((w, i) => <p key={i}>• {w}</p>)}</details>}
                <p className="xsmall muted">Exemplo — {preview.articles[0]?.lab}: {preview.articles[0]?.units[0]?.t.slice(0, 160)}</p>
                <button className="btn btn-primary btn-block" onClick={confirm}>Validar e salvar no aparelho</button>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
