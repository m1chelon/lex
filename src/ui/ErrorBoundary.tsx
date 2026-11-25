// Se uma tela quebrar, mostra uma saída em vez de deixar o app inteiro em branco.
import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode; onBack?: () => void; full?: boolean };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error) {
    try {
      const log = JSON.parse(localStorage.getItem('lex.crashes') ?? '[]') as unknown[];
      log.unshift({ at: new Date().toISOString(), msg: String(error?.message ?? error).slice(0, 300), stack: String(error?.stack ?? '').slice(0, 1200) });
      localStorage.setItem('lex.crashes', JSON.stringify(log.slice(0, 10)));
    } catch { /* sem armazenamento */ }
    console.error('[LEX] tela quebrou', error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    const { onBack, full } = this.props;
    return (
      <div className="crash-card" role="alert" style={full ? { minHeight: '100dvh' } : undefined}>
        <strong>Algo deu errado nesta tela</strong>
        <p className="small muted">Seu progresso está salvo. Volte e tente de novo; se repetir, recarregue o app.</p>
        <div className="row" style={{ gap: 8 }}>
          {onBack && <button className="btn btn-primary" onClick={() => { this.setState({ error: null }); onBack(); }}>Voltar</button>}
          <button className="btn btn-quiet" onClick={() => location.reload()}>Recarregar</button>
        </div>
        <details className="xsmall muted"><summary>Detalhes técnicos</summary><code style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error.message)}</code></details>
      </div>
    );
  }
}
