import { ReactNode } from "react";

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="card-paper p-8 sm:p-12 text-center max-w-lg mx-auto">
      {icon && (
        <div className="w-14 h-14 mx-auto rounded-full bg-bg-vellum border border-line-medium flex items-center justify-center text-ink-muted mb-5">
          {icon}
        </div>
      )}
      <h3 className="font-display italic text-2xl text-ink mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-ink-2 leading-relaxed mb-6 max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}
