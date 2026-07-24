import { Card, CardContent, CardHeader, CardTitle } from "@bcp/ui";

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Gallery</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Public/private photo gallery delivery and selection experience — scaffold placeholder. Business features are built in a later phase.
        </CardContent>
      </Card>
    </main>
  );
}
