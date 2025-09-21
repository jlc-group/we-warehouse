import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Database, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { resourceMonitor, connectionManager, cacheManager } from '@/utils/apiOptimization';

export function ResourceMonitor() {
  const [metrics, setMetrics] = useState(resourceMonitor.getMetrics());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(resourceMonitor.getMetrics());
    }, 10000); // Reduced from 2s to 10s to save resources

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-600';
    if (value <= thresholds.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (value <= thresholds.warning) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          size="sm"
          variant="outline"
          className="bg-white shadow-lg"
        >
          <Activity className="h-4 w-4 mr-2" />
          Resource Monitor
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96">
      <Card className="bg-white shadow-xl border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Resource Monitor
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  resourceMonitor.reset();
                  cacheManager.clear();
                  setMetrics(resourceMonitor.getMetrics());
                }}
                size="sm"
                variant="ghost"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button
                onClick={() => setIsVisible(false)}
                size="sm"
                variant="ghost"
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API Performance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-3 w-3" />
                API Performance
              </span>
              {getStatusIcon(metrics.errorRate, { good: 5, warning: 15 })}
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">API Calls</div>
                <div className="font-mono">{metrics.apiCalls}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Avg Response</div>
                <div className={`font-mono ${getStatusColor(metrics.avgResponseTime, { good: 500, warning: 1500 })}`}>
                  {metrics.avgResponseTime.toFixed(0)}ms
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Error Rate</div>
                <div className={`font-mono ${getStatusColor(metrics.errorRate, { good: 5, warning: 15 })}`}>
                  {metrics.errorRate.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Cache Hit</div>
                <div className={`font-mono ${getStatusColor(100 - metrics.cacheHitRate, { good: 20, warning: 50 })}`}>
                  {metrics.cacheHitRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Database className="h-3 w-3" />
                Connections
              </span>
              {getStatusIcon(metrics.connectionStatus.active, { good: 3, warning: 4 })}
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Active: {metrics.connectionStatus.active}/5</span>
                <span>Queued: {metrics.connectionStatus.queued}</span>
              </div>
              <Progress 
                value={(metrics.connectionStatus.active / 5) * 100} 
                className="h-2"
              />
            </div>
          </div>

          {/* Cache Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-3 w-3" />
                Cache
              </span>
              <Badge variant="outline" className="text-xs">
                {cacheManager.getStats().size} items
              </Badge>
            </div>
          </div>

          {/* Warnings */}
          {(metrics.errorRate > 15 || metrics.avgResponseTime > 2000 || metrics.connectionStatus.active >= 4) && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-xs text-yellow-800">
                {metrics.errorRate > 15 && "High error rate detected. "}
                {metrics.avgResponseTime > 2000 && "Slow response times. "}
                {metrics.connectionStatus.active >= 4 && "Connection pool nearly full. "}
                Consider reducing API usage.
              </AlertDescription>
            </Alert>
          )}

          {/* Resource Usage Tips */}
          <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
            💡 <strong>Tips:</strong>
            <ul className="mt-1 space-y-1 ml-2">
              <li>• Cache hit rate &gt; 80% is good</li>
              <li>• Response time &lt; 500ms is optimal</li>
              <li>• Error rate &lt; 5% is healthy</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
