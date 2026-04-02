import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

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

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-5">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-7 h-7 text-white" />
                <h1 className="text-lg font-bold text-white">Something went wrong</h1>
              </div>
            </div>
            <div className="p-5">
              <p className="text-gray-600 text-sm mb-4">
                An unexpected error occurred. Please try again.
              </p>
              {import.meta.env.DEV && this.state.error && (
                <pre className="bg-gray-100 rounded p-3 text-xs text-red-600 overflow-auto mb-4">
                  {this.state.error.toString()}
                </pre>
              )}
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
