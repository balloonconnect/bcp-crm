import { GalleryBootstrap } from "../../../components/gallery/gallery-bootstrap";

interface PageProps {
  params: { token: string };
}

export default function PublicGalleryPage({ params }: PageProps) {
  return <GalleryBootstrap token={params.token} />;
}
