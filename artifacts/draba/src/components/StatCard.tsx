import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    positive: boolean;
  };
  className?: string;
}

export function StatCard({ icon: Icon, label, value, trend, className = '' }: StatCardProps) {
  return (
    <Card className={className} data-testid={`stat-card-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
            <p className="text-3xl font-bold mt-2" data-testid={`stat-value-${label.toLowerCase().replace(/\s+/g, '-')}`}>
              {value}
            </p>
            {trend && (
              <p className={`text-xs mt-2 ${trend.positive ? 'text-status-online' : 'text-destructive'}`}>
                {trend.positive ? '+' : ''}{trend.value}% from last period
              </p>
            )}
          </div>
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
