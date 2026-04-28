import { CONTRACT_TYPES } from "@/data/walletTypes";

export type WalletExtension = {
  id: string;
  name: string;
  icon: string;
  description: string;
  comingSoon: boolean;
};

export function getSortedExtensions(): WalletExtension[] {
  const extensions = CONTRACT_TYPES.filter((contract) => contract.ext).map((contract) => ({
    id: contract.name,
    name: contract.label || contract.name,
    icon: contract.icon,
    description: contract.description,
    comingSoon: contract.comingSoon,
  }));

  return [...extensions].sort((a, b) => {
    if (a.comingSoon !== b.comingSoon) return a.comingSoon ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}
