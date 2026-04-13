export type SmartWalletTypes = {
  label: string;
  name: string;
  extensions: string[];
  ext: boolean;
  recomended: boolean;
};

export const ContractTypes: SmartWalletTypes[] = [
  {
    label: "Personal Wallet",
    name: "smart-wallet",
    extensions: ["Delegate STX"],
    ext: false,
    recomended: true,
  },
  {
    label: "Delegate STX",
    name: "ext-delegate-stx-pox-4",
    extensions: [],
    ext: true,
    recomended: false,
  },
];

// Documentation URLs
export const DOCS_URL =
  "https://polimartlabs.gitbook.io/smart-wallet/csw-locker-smart-wallet-for-bitcoin-and-stacks/why-smart-wallet";

// Navigation Items
import {
  Wallet,
  Send,
  History,
  ArrowDown,
  ArrowUp,
  Puzzle,
  CheckSquare,
  ScrollText,
} from "lucide-react";

export const getBaseNavItems = (walletId?: string) => [
  { path: `/dashboard/${walletId}`, label: "Dashboard", icon: Wallet },
  { path: `/send/${walletId}`, label: "Send", icon: Send },
  { path: `/receive/${walletId}`, label: "Receive", icon: ArrowDown },
  { path: `/actions/${walletId}`, label: "Extensions", icon: Puzzle },
  {
    path: `/contract-actions/${walletId}`,
    label: "Contract Actions",
    icon: CheckSquare,
  },
  { path: `/history/${walletId}`, label: "History", icon: History },
  {
    path: `/wallet-details/${walletId}`,
    label: "Wallet Details",
    icon: ScrollText,
  },
];

export const getNavItemsWithStacking = (
  walletId?: string,
  isStackingActive?: boolean
) => {
  const baseItems = getBaseNavItems(walletId);

  return isStackingActive
    ? [
        ...baseItems.slice(0, 3), // Dashboard, Send, Receive
        { path: `/stacking/${walletId}`, label: "Stacking", icon: ArrowUp },
        ...baseItems.slice(3), // Extensions, Contract Actions, History, Wallet Details
      ]
    : baseItems;
};
