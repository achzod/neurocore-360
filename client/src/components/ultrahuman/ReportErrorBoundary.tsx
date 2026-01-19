import React from 'react';

type ReportErrorBoundaryProps = {
  children: React.ReactNode;
  onRetry?: () => void;
  message?: string;
};

type ReportErrorBoundaryState = {
  hasError: boolean;
};

export class ReportErrorBoundary extends React.Component<
  ReportErrorBoundaryProps,
  ReportErrorBoundaryState
> {
  state: ReportErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ReportErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("[ReportErrorBoundary] Render error:", error);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center px-6 text-center"
          style={{
            backgroundColor: "var(--color-bg, #000)",
            color: "var(--color-text, #fff)"
          }}
        >
          <div className="max-w-md space-y-4">
            <h2 className="text-xl font-bold">Affichage interrompu</h2>
            <p className="text-sm" style={{ color: "var(--color-text-muted, #9ca3af)" }}>
              {this.props.message ||
                "Le rapport a rencontré une erreur d'affichage. Je relance la génération si besoin."}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 rounded font-semibold"
              style={{
                backgroundColor: "var(--color-primary, #facc15)",
                color: "var(--color-on-primary, #000)"
              }}
            >
              Recharger le rapport
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
