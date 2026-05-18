import { Component } from "react";
import { RefreshCw, Home } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : "/api";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, stack: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    const stack = info?.componentStack ?? null;
    this.setState({ stack });
    console.error("ErrorBoundary caught:", error, info);

    // Report to server so the component stack appears in Railway logs
    try {
      fetch(`${API_BASE}/client-error`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error?.message ?? String(error),
          componentStack: stack,
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {});
    } catch (_) {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center p-6">
          <div className="text-center max-w-lg w-full">
            <div className="text-6xl mb-6">💥</div>
            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-gray-400 mb-4 text-sm">
              An unexpected error occurred. This has been noted.
            </p>
            {this.state.error?.message && (
              <p className="text-red-400 text-xs font-mono bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-3 text-left break-all">
                {this.state.error.message}
              </p>
            )}
            {this.state.stack && (
              <pre className="text-gray-400 text-xs font-mono bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-6 text-left break-all whitespace-pre-wrap max-h-48 overflow-auto">
                {this.state.stack.trim()}
              </pre>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: null, stack: null })}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-semibold text-sm transition-colors">
                <RefreshCw size={15} /> Try Again
              </button>
              <a href="/dashboard"
                className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 font-medium text-sm transition-colors">
                <Home size={15} /> Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
