
import WalletContractDetails from "@/components/WalletContractDetails";
import WalletLayout from "@/components/WalletLayout";
import { Navigate, useParams } from "react-router-dom";
import { getVaultFromRouteId } from "@/lib/vaultRoute";

const ContractDetails = () => {
  const { walletId } = useParams<{ walletId: `${string}.${string}` }>()
  const vaultFromRoute = getVaultFromRouteId(walletId);

  if (vaultFromRoute) {
    return <Navigate to={`/btcvault/${vaultFromRoute.id}/policy`} replace />;
  }

  return (
    <WalletLayout>
      <div className="space-y-6">
        <WalletContractDetails walletId={walletId!} />
      </div>
    </WalletLayout>
  )

};

export default ContractDetails;
