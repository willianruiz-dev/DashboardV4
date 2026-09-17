import type { ReactNode } from "react";

interface PageHeaderProps {
  actions?: ReactNode;
  description: string;
  title: string;
}

export function PageHeader({ actions, description, title }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
