import { cn } from "@/lib/utils";

export function PageHeader(props: {
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  className?: string;
}) {
  const { title, subtitle, right, className } = props;
  return (
    <div className={cn("mb-6 flex items-start justify-between gap-4", className)}>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          {title}
        </h1>
        <p className="text-sm text-[hsl(var(--muted-fg))]">{subtitle}</p>
      </div>
      {right}
    </div>
  );
}

