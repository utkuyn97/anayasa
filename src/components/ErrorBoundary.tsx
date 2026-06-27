/**
 * ErrorBoundary — Catches uncaught React errors and shows fallback UI.
 * Prevents white screen of death.
 */
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen-dvh flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <svg
              className="h-8 w-8 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Bir şeyler yanlış gitti
          </h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Beklenmeyen bir hata oluştu. Sayfayı yenilemeyi deneyin.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors active:scale-[0.98]"
            >
              Tekrar dene
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-xl bg-muted px-6 py-2.5 text-sm font-medium text-foreground transition-colors active:scale-[0.98]"
            >
              Sayfayı yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
