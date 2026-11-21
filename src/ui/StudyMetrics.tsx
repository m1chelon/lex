export function StudyMetrics({ seen, total, correct, attempts, label = 'Conteúdo praticado' }: {
  seen: number;
  total: number;
  correct: number;
  attempts: number;
  label?: string;
}) {
  return <div className="study-metrics">
    <div><strong>{total ? `${Math.round(seen / total * 100)}%` : '—'}</strong><span>{label}</span></div>
    <div><strong>{attempts ? `${Math.round(correct / attempts * 100)}%` : '—'}</strong><span>Acertos na primeira tentativa</span></div>
  </div>;
}
