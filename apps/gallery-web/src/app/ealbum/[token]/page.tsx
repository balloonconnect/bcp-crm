import { EAlbumViewer } from "../../../components/ealbum/ealbum-viewer";

interface PageProps {
  params: { token: string };
}

export default function EAlbumPage({ params }: PageProps) {
  return <EAlbumViewer token={params.token} />;
}
