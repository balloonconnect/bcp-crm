import { Card, CardContent, CardHeader, CardTitle } from "@bcp/ui";

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Client Portal</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Where a studio&apos;s clients track bookings, payments, and deliverables — scaffold placeholder. Business features are built in a later phase.
        </CardContent>
      </Card>
    </main>
  );
}
