import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../ui/card";
import { InvoicesCard } from "./InvoicesCard";

interface PlanCardProps {
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function PlanCard({ title, description, children, footer }: PlanCardProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">{children}</div>
        </CardContent>
        {footer && <CardFooter>{footer}</CardFooter>}
      </Card>
      <InvoicesCard />
    </div>
  );
}
