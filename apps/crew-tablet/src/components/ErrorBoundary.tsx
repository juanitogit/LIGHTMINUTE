import { Component, type ErrorInfo, type ReactNode } from "react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled component error:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-box" role="alert" aria-live="polite">
          <div className="error-boundary-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <strong style={{ color: "#f87171", fontSize: "11px" }}>
              {this.props.fallbackTitle ?? "Visualización biomédica no disponible"}
            </strong>
          </div>
          <p style={{ color: "var(--muted, #94a3b8)", fontSize: "10px", margin: "4px 0 8px", lineHeight: "1.4" }}>
            {this.props.fallbackMessage ?? "Ocurrió un error al renderizar este módulo. Los datos fisiológicos permanecen seguros y disponibles en la telemetría."}
          </p>
          <button
            type="button"
            className="error-boundary-retry-btn"
            onClick={this.resetError}
            style={{
              padding: "4px 10px",
              background: "rgba(56, 189, 248, 0.12)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "6px",
              color: "#38bdf8",
              fontSize: "10px",
              cursor: "pointer",
            }}
          >
            Reintentar visualización
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
