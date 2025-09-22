import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  retryCount: number;
}

export class ErrorBoundaryFetch extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundaryFetch caught an error:', error, errorInfo);

    // Log specific fetch-related errors
    if (error.message.includes('fetch') || error.message.includes('AbortError')) {
      console.error('Fetch-related error detected:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }

    // Check for infinite loop indicators
    if (error.message.includes('Maximum update depth exceeded') ||
        errorInfo.componentStack.includes('useEffect')) {
      console.error('⚠️ Possible infinite loop detected in fetch operations');
    }

    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      console.log(`Retrying... Attempt ${this.state.retryCount + 1}/${this.maxRetries}`);
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-6 max-w-2xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>เกิดข้อผิดพลาดในการโหลดข้อมูล</AlertTitle>
            <AlertDescription className="mt-2 space-y-3">
              <p>
                {this.state.error?.message.includes('fetch')
                  ? 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'
                  : 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง'
                }
              </p>

              {process.env.NODE_ENV === 'development' && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium">
                    รายละเอียดข้อผิดพลาด (Development)
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                    {this.state.error?.stack}
                  </pre>
                </details>
              )}

              <div className="flex gap-2 pt-2">
                {this.state.retryCount < this.maxRetries && (
                  <Button
                    onClick={this.handleRetry}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    ลองใหม่ ({this.state.retryCount + 1}/{this.maxRetries})
                  </Button>
                )}

                <Button
                  onClick={this.handleReset}
                  variant="default"
                  size="sm"
                >
                  รีเซ็ต
                </Button>

                <Button
                  onClick={() => window.location.reload()}
                  variant="secondary"
                  size="sm"
                >
                  รีเฟรชหน้า
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}