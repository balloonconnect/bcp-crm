import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@bcp/ui";

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>BCP Studio OS Documentation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>Guides for platform admins, studio owners, team members, and clients — plus setup instructions for every integration and full API reference.</p>
          <Link href="/docs/product-overview" className="font-medium text-brand underline">Start with the Product Overview →</Link>
        </CardContent>
      </Card>
    </main>
  );
}
