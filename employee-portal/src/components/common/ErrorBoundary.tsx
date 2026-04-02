import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-white" />
                <div>
                  <h1 className="text-xl font-bold text-white">Something went wrong</h1>
                  <p className="text-sm text-red-100">We're sorry for the inconvenience</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                The application encountered an unexpected error. Please try again or return to the dashboard.
              </p>
              {import.meta.env.DEV && this.state.error && (
                <details className="mb-4">
                  <summary className="cursor-pointer text-xs font-medium text-gray-500 mb-1">
                    Error Details (Development Only)
                  </summary>
                  <pre className="bg-gray-100 dark:bg-gray-900 rounded p-3 text-xs text-red-600 dark:text-red-400 overflow-auto">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
              <div className="flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-bifrost-violet hover:bg-bifrost-violet-dark text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
