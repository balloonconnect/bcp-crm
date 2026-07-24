import { ContractSigningView } from "../../../components/contract-signing/contract-signing-view";

interface PageProps {
  params: { token: string };
}

export default function ContractSigningPage({ params }: PageProps) {
  return <ContractSigningView token={params.token} />;
}
