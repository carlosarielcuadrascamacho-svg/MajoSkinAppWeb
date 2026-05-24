"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-8">
          <h1 className="font-serif text-2xl font-bold text-foreground">
            Algo salió mal
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Reinicia la app o intenta de nuevo
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-6 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-white shadow-lg transition-all active:scale-95"
          >
            Reintentar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
