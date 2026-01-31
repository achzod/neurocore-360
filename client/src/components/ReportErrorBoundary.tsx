import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ReportErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Report Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="blood-report-premium min-h-screen bg-[--bg-primary] flex items-center justify-center p-6">
          <div className="max-w-md rounded-xl border border-rose-200 bg-[--bg-secondary] p-8 text-center">
            <div className="text-2xl font-semibold text-rose-600">Erreur</div>
            <p className="mt-4 text-sm text-slate-700">
              Une erreur est survenue lors du chargement du rapport.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
