// Política de Privacidade, Termos de Uso e Sobre.
import { CONTATO, PRIVACIDADE, SOBRE, TERMOS, LEGAL_UPDATED, type LegalSection } from '../content/legal';
import { PageHeader } from '../ui/primitives';
import { Mascot } from '../ui/Mascot';

export type LegalDocId = 'privacidade' | 'termos' | 'sobre';
export const LEGAL_TITLE: Record<LegalDocId, string> = { privacidade: 'Política de Privacidade', termos: 'Termos de Uso', sobre: 'Sobre o LEX' };
const DOCS: Record<LegalDocId, LegalSection[]> = { privacidade: PRIVACIDADE, termos: TERMOS, sobre: SOBRE };
export const APP_VERSION = '1.0.0';

export function LegalBody({ doc }: { doc: LegalDocId }) {
  return (
    <div className="legal stack" style={{ gap: 16 }}>
      {doc === 'sobre' && (
        <div className="row" style={{ gap: 14 }}>
          <Mascot mood="happy" size={72} />
          <div><div className="title-l">LEX</div><div className="xsmall muted">Versão {APP_VERSION} · lei seca, casos e simulados</div><div className="xsmall muted">Suporte: {CONTATO}</div></div>
        </div>
      )}
      {DOCS[doc].map((s) => (
        <section key={s.h}>
          <h2 className="title-s">{s.h}</h2>
          {s.p.map((t, i) => <p key={i} className="small muted" style={{ marginTop: 6, lineHeight: 1.55 }}>{t}</p>)}
        </section>
      ))}
      {doc !== 'sobre' && <p className="xsmall faint">Atualizado em {LEGAL_UPDATED}.</p>}
    </div>
  );
}

export function LegalScreen({ doc }: { doc: LegalDocId }) {
  return (
    <div className="stack" style={{ gap: 14 }}>
      <PageHeader title={LEGAL_TITLE[doc]} />
      <div className="card"><LegalBody doc={doc} /></div>
    </div>
  );
}
