export type SmartWalletTypes = {
    label: string
    name: string
    extensions: string[]
}

export const ContractTypes: SmartWalletTypes[] = [
    {
        label: "Personal Wallet",
        name: "smart-wallet",
        extensions: ["Multi-sig", "Time-lock"],
    }
]