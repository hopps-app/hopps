import { LucideIcon } from 'lucide-react';

import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export function EmptyState({ title, description, icon: Icon, action, className }: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
            {Icon && (
                <div className="rounded-full bg-muted p-4 mb-4">
                    <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                </div>
            )}
            <h3 className="text-lg font-medium text-foreground">{title}</h3>
            {description && <p className="text-muted-foreground mt-1 max-w-sm">{description}</p>}
            {action && (
                <Button onClick={action.onClick} className="mt-4">
                    {action.label}
                </Button>
            )}
        </div>
    );
}

export default EmptyState;
