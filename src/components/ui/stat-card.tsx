import { Card, CardContent } from "./card"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string;
  value: number;
  total?: number;
  className?: string;
}

export function StatCard({ title, value, total, className }: StatCardProps) {
  return (
    <Card className={cn("h-full", className)}>
      <CardContent className="flex flex-col justify-between h-full p-6">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex items-baseline gap-2 mt-2">
          <h2 className="text-3xl font-semibold">{value}</h2>
          {total !== undefined && (
            <p className="text-sm text-muted-foreground">/ {total}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}