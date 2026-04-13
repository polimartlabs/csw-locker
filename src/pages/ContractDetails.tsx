
import WalletContractDetails from "@/components/WalletContractDetails";
import WalletLayout from "@/components/WalletLayout";
import { useParams } from "react-router-dom";

const ContractDetails = () => {
  const { walletId } = useParams<{ walletId: `${string}.${string}` }>()

  return (
    <WalletLayout>
      <div className="space-y-6">
        <WalletContractDetails walletId={walletId!} />
      </div>
    </WalletLayout>
  )

};

export default ContractDetails;
