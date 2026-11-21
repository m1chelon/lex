import { useEffect, useRef, useState } from 'react';
import { gradeDoctrineParts } from '../learn/doctrineCourses';
import type { DoctrinePart } from '../learn/generators';
import { ICheck, IX } from '../ui/icons';
import { MascotQuestion } from '../ui/Mascot';

export function DoctrineQuestion({ parts, draft, result, active, onDraft, onAnswer, onInspect }: {
  parts: DoctrinePart[]; draft: string[]; result?: string[]; active: boolean;
  onDraft: (choices: string[]) => void; onAnswer: (correct: boolean, choices: string[]) => void;
  onInspect: (open: boolean) => void;
}) {
  const [index, setIndex] = useState(() => Math.min(draft.length, parts.length - 1));
  const heading = useRef<HTMLDivElement>(null);
  const changed = useRef(false);
  const part = parts[index];

  const choose = (id: string) => {
    if (!active || result) return;
    const next = draft.slice(0, index).concat(id);
    if (next.length === parts.length) { onAnswer(gradeDoctrineParts(parts, next), next); return; }
    changed.current = true;
    onDraft(next);
    setIndex(index + 1);
  };

  useEffect(() => {
    if (!changed.current && !result) return;
    const content = heading.current;
    content?.closest('.question-body')?.scrollTo({ top: 0 });
    content?.focus({ preventScroll: true });
  }, [index, result]);

  useEffect(() => {
    if (!active || result) return;
    const select = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey
        || target?.closest('input, textarea, select, [contenteditable="true"]') || document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) return;
      if (!/^[1-4a-d]$/i.test(event.key)) return;
      const choice = part.options[Number(event.key) - 1] ?? part.options[event.key.toLowerCase().charCodeAt(0) - 97];
      if (choice) { event.preventDefault(); choose(choice.id); }
    };
    window.addEventListener('keydown', select);
    return () => window.removeEventListener('keydown', select);
  }, [active, result, part, draft, index, onDraft, onAnswer]);

  if (result) {
    const rows = parts.map((entry, i) => ({
      prompt: entry.prompt, selected: entry.options.find(({ id }) => id === result[i]), right: entry.options.find(({ correct }) => correct)!,
    }));
    const score = rows.filter(({ selected }) => selected?.correct).length;
    const firstMiss = rows.find(({ selected }) => !selected?.correct);
    return <section ref={heading} tabIndex={-1} className="doctrine-result contest-panel">
      <h2 className="title-m">{score} de {parts.length} partes corretas</h2>
      {firstMiss && <p><strong>O que confundiu</strong> · {firstMiss.right.why}</p>}
      <details className="answer-explanation" onToggle={(event) => onInspect(event.currentTarget.open)}>
        <summary>Ver correção completa</summary>
        <ol className="doctrine-resolutions">
          {rows.map(({ prompt, selected, right }, i) => <li key={prompt}>
            <strong><span className={selected?.correct ? 'contest-right' : 'contest-wrong'}>{selected?.correct ? <ICheck size={16} /> : <IX size={16} />}</span> Parte {i + 1}</strong>
            <p>{prompt}</p>
            {!selected?.correct && <p className="muted">Sua resposta · {selected?.text ?? 'Em branco'}</p>}
            <p><strong>Gabarito</strong> · {right.text}</p>
            <p>{right.why}</p>
          </li>)}
        </ol>
      </details>
    </section>;
  }

  return <div ref={heading} tabIndex={-1} className="stack doctrine-challenge">
    <div className="row between">
      <span className="small muted" aria-live="polite">Parte {index + 1} de {parts.length}</span>
      {index > 0 && <button className="btn btn-quiet btn-sm" onClick={() => { changed.current = true; setIndex(index - 1); }}>Parte anterior</button>}
    </div>
    {index === 0 && <p className="small muted">Acerte as {parts.length} partes para pontuar.</p>}
    <MascotQuestion text={part.prompt} />
    <div className="study-options" role="group" aria-label={`Respostas da parte ${index + 1}`}>
      {part.options.map(({ id, text }, i) => <button key={id} className={`opt${draft[index] === id ? ' selected' : ''}`}
        aria-pressed={draft[index] === id} onClick={() => choose(id)}>
        <span className="opt-key" aria-hidden="true">{String.fromCharCode(65 + i)}</span><span>{text}</span>
      </button>)}
    </div>
  </div>;
}
