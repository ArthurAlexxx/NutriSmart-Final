// src/components/stats-card.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  icon: React.ComponentType<{className?: string}>;
  label: string;
  value: string | number;
  trend?: string;
  className?: string;
}

export function StatsCard({ icon: Icon, label, value, trend, className }: StatsCardProps) {
  return (
    <Card className={cn("shadow-md rounded-2xl border-border/50 overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-br from-secondary/30 to-transparent pb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <CardDescription className="text-xs">{label}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="text-2xl font-bold">{value}</div>
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </CardContent>
    </Card>
  );
}
