import { PortalApp } from "../../../components/portal/portal-app";

interface PageProps {
  params: { studioSlug: string };
}

export default function ClientPortalPage({ params }: PageProps) {
  return <PortalApp studioSlug={params.studioSlug} />;
}
