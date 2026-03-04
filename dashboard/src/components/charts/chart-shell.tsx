import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ChartShell(props: {
  title: string;
  description: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  const { title, description, children, right, className } = props;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {right}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

