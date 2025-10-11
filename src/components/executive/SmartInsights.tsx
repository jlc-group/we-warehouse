import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Trophy,
  Clock,
  ArrowRight,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SmartInsight {
  type: 'trend' | 'anomaly' | 'recommendation' | 'achievement';
  severity: 'info' | 'warning' | 'critical' | 'success';
  title: string;
  description: string;
  action?: string;
  actionLabel?: string;
}

interface SmartInsightsProps {
  insights: SmartInsight[];
}

export const SmartInsights = ({ insights }: SmartInsightsProps) => {
  const getInsightConfig = (insight: SmartInsight) => {
    const configs = {
      trend: {
        icon: TrendingUp,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        emoji: '📈',
      },
      anomaly: {
        icon: AlertTriangle,
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        emoji: '⚠️',
      },
      recommendation: {
        icon: Lightbulb,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        emoji: '💡',
      },
      achievement: {
        icon: Trophy,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        emoji: '🏆',
      },
    };

    return configs[insight.type];
  };

  const getSeverityBadge = (severity: SmartInsight['severity']) => {
    const variants = {
      info: { label: 'ข้อมูล', variant: 'default' as const },
      warning: { label: 'เตือน', variant: 'secondary' as const },
      critical: { label: 'สำคัญ', variant: 'destructive' as const },
      success: { label: 'ดีเยี่ยม', variant: 'default' as const },
    };

    return variants[severity];
  };

  if (insights.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Clock className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">กำลังวิเคราะห์ข้อมูล...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold">🤖 Smart Insights</h3>
        </div>
        <Badge variant="outline" className="bg-gradient-to-r from-purple-50 to-pink-50">
          {insights.length} insights
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight, index) => {
          const config = getInsightConfig(insight);
          const severityBadge = getSeverityBadge(insight.severity);
          const Icon = config.icon;

          return (
            <Card
              key={index}
              className={cn(
                "border-l-4 transition-all hover:shadow-lg hover:-translate-y-1",
                config.borderColor
              )}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn("p-2 rounded-lg", config.bgColor)}>
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>
                    <Badge variant={severityBadge.variant} className="text-xs">
                      {severityBadge.label}
                    </Badge>
                  </div>

                  {/* Content */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm leading-tight flex items-start gap-1">
                      <span>{config.emoji}</span>
                      <span>{insight.title}</span>
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {insight.description}
                    </p>
                  </div>

                  {/* Action */}
                  {insight.action && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("w-full justify-between group", config.color)}
                      onClick={() => {
                        // Handle action
                        console.log('Action:', insight.action);
                      }}
                    >
                      <span className="text-xs font-medium">
                        {insight.actionLabel || 'ดูรายละเอียด'}
                      </span>
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </div>
        <span>อัปเดตทุก 30 วินาที</span>
      </div>
    </div>
  );
};
