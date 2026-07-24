import { prisma } from "@bcp/database";
import { scoreMatch, type SearchProvider, type SearchQuery, type SearchResult } from "@bcp/search";

/**
 * "Use PostgreSQL search first" — the concrete implementation of
 * `@bcp/search`'s `SearchProvider` interface. Uses `ILIKE` substring
 * matching (case-insensitive, no extension dependency) as the actual
 * "fuzzy search" baseline named in the brief — a deliberately modest
 * starting point ("fuzzy" here means tolerant of partial/substring
 * matches, not full typo-tolerant matching) that's honest about what
 * it does rather than overselling a `pg_trgm` similarity search this
 * environment can't verify against a live database. Swapping in
 * `pg_trgm`'s `similarity()`, or an entirely different engine
 * (Meilisearch, Elasticsearch) later, means writing one new
 * `SearchProvider` implementation — nothing in `search.service.ts` or
 * the command menu changes.
 */
export class PostgresSearchProvider implements SearchProvider {
  async search(query: SearchQuery): Promise<SearchResult[]> {
    const perEntityLimit = Math.max(3, Math.ceil(query.limit / Math.max(query.entityTypes.length, 1)));
    const resultSets = await Promise.all(query.entityTypes.map((entityType) => this.searchEntity(entityType, query.studioId, query.query, perEntityLimit)));
    return resultSets.flat();
  }

  private async searchEntity(entityType: string, studioId: string, q: string, limit: number): Promise<SearchResult[]> {
    const contains = { contains: q, mode: "insensitive" as const };

    switch (entityType) {
      case "lead": {
        const rows = await prisma.lead.findMany({ where: { studioId, name: contains }, take: limit, select: { id: true, name: true, eventType: true } });
        return rows.map((r: { id: string; name: string; eventType: string | null }) => ({ entityType, entityId: r.id, title: r.name, subtitle: r.eventType, score: scoreMatch(r.name, q), url: `/leads?id=${r.id}` }));
      }
      case "client": {
        const rows = await prisma.client.findMany({ where: { studioId, name: contains, deletedAt: null }, take: limit, select: { id: true, name: true, email: true } });
        return rows.map((r: { id: string; name: string; email: string | null }) => ({ entityType, entityId: r.id, title: r.name, subtitle: r.email, score: scoreMatch(r.name, q), url: `/clients?id=${r.id}` }));
      }
      case "event": {
        const rows = await prisma.event.findMany({ where: { studioId, eventType: contains }, take: limit, select: { id: true, eventType: true, venue: true } });
        return rows.map((r: { id: string; eventType: string; venue: string | null }) => ({ entityType, entityId: r.id, title: r.eventType, subtitle: r.venue, score: scoreMatch(r.eventType, q), url: `/events?id=${r.id}` }));
      }
      case "booking": {
        const rows = await prisma.booking.findMany({ where: { studioId, status: contains }, take: limit, select: { id: true, status: true } });
        return rows.map((r: { id: string; status: string }) => ({ entityType, entityId: r.id, title: `Booking (${r.status})`, subtitle: null, score: scoreMatch(r.status, q), url: `/bookings?id=${r.id}` }));
      }
      case "quotation": {
        const rows = await prisma.quotation.findMany({ where: { studioId, quotationNumber: contains }, take: limit, select: { id: true, quotationNumber: true, status: true } });
        return rows.map((r: { id: string; quotationNumber: string; status: string }) => ({ entityType, entityId: r.id, title: r.quotationNumber, subtitle: r.status, score: scoreMatch(r.quotationNumber, q), url: `/quotations?id=${r.id}` }));
      }
      case "invoice": {
        const rows = await prisma.invoice.findMany({ where: { studioId, invoiceNumber: contains }, take: limit, select: { id: true, invoiceNumber: true, status: true } });
        return rows.map((r: { id: string; invoiceNumber: string; status: string }) => ({ entityType, entityId: r.id, title: r.invoiceNumber, subtitle: r.status, score: scoreMatch(r.invoiceNumber, q), url: `/invoices?id=${r.id}` }));
      }
      case "payment": {
        const rows = await prisma.clientPayment.findMany({ where: { invoice: { studioId }, method: contains }, take: limit, select: { id: true, method: true, amount: true } });
        return rows.map((r: { id: string; method: string; amount: number }) => ({ entityType, entityId: r.id, title: `Payment via ${r.method}`, subtitle: `₹${(r.amount / 100).toLocaleString("en-IN")}`, score: scoreMatch(r.method, q), url: `/invoices?paymentId=${r.id}` }));
      }
      case "task": {
        const rows = await prisma.task.findMany({ where: { studioId, title: contains }, take: limit, select: { id: true, title: true, status: true } });
        return rows.map((r: { id: string; title: string; status: string }) => ({ entityType, entityId: r.id, title: r.title, subtitle: r.status, score: scoreMatch(r.title, q), url: `/tasks?id=${r.id}` }));
      }
      case "gallery": {
        const rows = await prisma.gallery.findMany({ where: { studioId, title: contains }, take: limit, select: { id: true, title: true } });
        return rows.map((r: { id: string; title: string | null }) => ({ entityType, entityId: r.id, title: r.title ?? "Untitled gallery", subtitle: null, score: scoreMatch(r.title ?? "", q), url: `/galleries?id=${r.id}` }));
      }
      case "album": {
        const rows = await prisma.album.findMany({ where: { studioId, status: contains }, take: limit, select: { id: true, status: true } });
        return rows.map((r: { id: string; status: string }) => ({ entityType, entityId: r.id, title: `Album (${r.status})`, subtitle: null, score: scoreMatch(r.status, q), url: `/albums?id=${r.id}` }));
      }
      case "team": {
        const rows = await prisma.studioUser.findMany({ where: { studioId, name: contains, deletedAt: null }, take: limit, select: { id: true, name: true, email: true } });
        return rows.map((r: { id: string; name: string; email: string }) => ({ entityType, entityId: r.id, title: r.name, subtitle: r.email, score: scoreMatch(r.name, q), url: `/team?id=${r.id}` }));
      }
      case "vendor": {
        const rows = await prisma.vendor.findMany({ where: { studioId, name: contains }, take: limit, select: { id: true, name: true, contactPersonName: true } });
        return rows.map((r: { id: string; name: string; contactPersonName: string | null }) => ({ entityType, entityId: r.id, title: r.name, subtitle: r.contactPersonName, score: scoreMatch(r.name, q), url: `/vendors?id=${r.id}` }));
      }
      case "equipment": {
        const rows = await prisma.equipment.findMany({ where: { studioId, name: contains }, take: limit, select: { id: true, name: true } });
        return rows.map((r: { id: string; name: string }) => ({ entityType, entityId: r.id, title: r.name, subtitle: null, score: scoreMatch(r.name, q), url: `/equipment?id=${r.id}` }));
      }
      default:
        return [];
    }
  }
}
