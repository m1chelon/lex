import { motion } from 'motion/react';
import { doutrinaFor } from '../learn/doutrina';
import { doutrinaMeta } from '../learn/doutrinaStore';
import { nav } from '../ui/nav';
import { CType, spring, useAsync } from '../ui/primitives';
import { reducedMotion } from '../ui/settings';

export function DoutrinaCard({ articleId, unitId }: { articleId?: string; unitId?: string }) {
  const note = useAsync(() => doutrinaFor(articleId, unitId), [articleId, unitId]);
  if (!articleId || note === undefined) return null;
  if (!note) return <DoutrinaEmpty />;
  return (
    <motion.div className="doutrina" initial={reducedMotion() ? false : { y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={spring}>
      <div className="row" style={{ gap: 8, justifyContent: 'space-between' }}>
        <span className="caps">Na doutrina · {note.artigo}</span>
        <CType k="doutrina" />
      </div>
      {note.topico && <div className="small" style={{ fontWeight: 650, marginTop: 6 }}>{note.topico}</div>}
      <p className="doutrina-text open">{note.topico && note.trecho.startsWith(note.topico) ? note.trecho.slice(note.topico.length + 1).trim() : note.trecho}</p>
      <div className="xsmall faint">{note.obra}, p. {note.pagina} (página do PDF) · trecho literal do seu acervo</div>
    </motion.div>
  );
}

function DoutrinaEmpty() {
  const meta = useAsync(doutrinaMeta, []);
  if (meta === undefined) return null;
  if (!meta && !import.meta.env.VITE_WITH_DOUTRINA) return <button className="doutrina empty-note xsmall muted" style={{ width: '100%' }} onClick={() => nav.tab('me')}>Comentários da doutrina: importe seu acervo em Você → Doutrina.</button>;
  return <div className="doutrina empty-note xsmall muted">Não há doutrina disponível para este artigo.</div>;
}
