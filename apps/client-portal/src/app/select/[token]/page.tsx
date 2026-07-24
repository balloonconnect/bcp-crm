import { SelectionViewer } from "../../../components/selection/selection-viewer";

interface PageProps {
  params: { token: string };
}

export default function AlbumSelectionPage({ params }: PageProps) {
  return <SelectionViewer token={params.token} />;
}
