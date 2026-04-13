import { ContractType } from "@/data/walletTypes";
import DelegateStx from "./DelegateStx";

interface Props {
    extensionInfo: ContractType;
}

// At this point, we can define individual components for each extension
// and use this component to dynamically render the appropriate extension based on selection.

const ExtensionSelector: React.FC<Props> = ({ extensionInfo }) => {
    switch (extensionInfo?.name) {
        case "ext-delegate-stx-pox-4":
            return <DelegateStx extensionInfo={extensionInfo}/>;
        default:
            return null;
    }
};


export default ExtensionSelector