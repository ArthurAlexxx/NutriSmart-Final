// src/components/page-header.tsx
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';

interface PageHeaderProps {
  icon: React.ComponentType<{className?: string}>;
  title: string;
  description: string;
  action?: React.ReactNode;
  badge?: string;
}

export function PageHeader({ icon: Icon, title, description, action, badge }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in-50 duration-500">
      <div className="flex-1 space-y-1.5 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary"/>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </div>
      {action && <div className="w-full sm:w-auto">{action}</div>}
    </div>
  );
}
