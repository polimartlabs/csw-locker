import { useEffect, useState } from "react"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import PrimaryButton from "../ui/primary-button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Checkbox } from "../ui/checkbox"
import { useParams } from "react-router-dom"
import { ContractType } from "@/data/walletTypes"
import { useTxServices } from "@/hooks/useTxServices"
import { useAccountBalanceService } from "@/hooks/useAccountBalanceService"

interface Props {
    extensionInfo: ContractType
}

const DelegateStx: React.FC<Props> = ({ extensionInfo }) => {
    const { walletId } = useParams<{ walletId: string }>()
    const { callExtensionContract, isLoading } = useTxServices()
    const [action, setAction] = useState<'delegate' | 'revoke'>('delegate')
    const [amount, setAmount] = useState<number>(0)
    const [recipient, setRecipient] = useState<string>('')
    const [cycles, setCycles] = useState<number>(1)
    const [showAdvanced, setShowAdvanced] = useState<boolean>(false)
    const [version, setVersion] = useState<string>('')
    const [hashbytes, setHashbytes] = useState<string>('')

    const { stxBalance } = useAccountBalanceService(walletId as `${string}.${string}`)
    const availableBalance = +stxBalance?.balance || 0
    const isAmountExceeded = action === 'delegate' && amount > availableBalance
    const isAmountTooLow = action === 'delegate' && amount > 0 && amount < 100
    const isAmountInvalid = isAmountExceeded || isAmountTooLow

    const resetForm = () => {
        setAction('delegate')
        setAmount(0)
        setRecipient('')
        setCycles(1)
        setShowAdvanced(false)
        setVersion('')
        setHashbytes('')
    }

    async function handleExecuteAction() {
        if (!walletId || !extensionInfo?.name) return;

        const txPayload = {
            action,
            extension: `${walletId.split('.')[0]}.${extensionInfo.name}`,
            "amount-ustx": amount,
            decimal: 6,
            "delegate-to": recipient,
            "until-burn-ht": cycles,
            "pox-addr": {
                version,
                hashbytes
            }
        }

        try {
            await callExtensionContract(walletId as `${string}.${string}`, txPayload);
        } catch (error) {
            console.error('Failed to execute extension action:', error);
        }
    }

    useEffect(() => {
        // Extension info loaded
    }, [extensionInfo])

    return (
        <div className="flex flex-col gap-3">
            <div className="space-y-2">
                <Label htmlFor="action" className="text-slate-300">Action</Label>
                <Select value={action} onValueChange={(e: "delegate" | "revoke") => setAction(e)}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                        <SelectValue placeholder="Select action type" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600 text-white shadow-lg">
                        <SelectItem value="delegate" className="text-white hover:bg-slate-700 focus:bg-slate-700 focus:text-white">Delegate</SelectItem>
                        <SelectItem value="revoke" className="text-white hover:bg-slate-700 focus:bg-slate-700 focus:text-white">Revoke</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="action" className="text-slate-300">Amount</Label>
                    <span className="text-slate-400 text-sm">Available: {availableBalance} STX</span>
                </div>
                <Input
                    id="action"
                    type="number"
                    min={action === 'delegate' ? 100 : 0}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder={`Enter ${action} amount${action === 'delegate' ? ' (min: 100 STX)' : ''}`}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                />
                {isAmountExceeded && action === 'delegate' && (
                    <p className="text-red-400 text-sm">
                        Amount exceeds available balance ({availableBalance} STX)
                    </p>
                )}
                {isAmountTooLow && action === 'delegate' && (
                    <p className="text-red-400 text-sm">
                        Minimum amount is 100 STX
                    </p>
                )}
            </div>

            <div className="space-y-2">
                <Label htmlFor="action" className="text-slate-300">Recipient</Label>
                <Input
                    id="action"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder={`e.g ${walletId}`}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="action" className="text-slate-300">Cycles</Label>
                <Input
                    id="action"
                    type="number"
                    min={1}
                    max={availableBalance}
                    value={cycles}
                    onChange={(e) => setCycles(Number(e.target.value))}
                    placeholder="e.g., transfer, approve, delegate"
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                />
            </div>

            <div className="space-y-3">
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="advanced"
                        checked={showAdvanced}
                        onCheckedChange={(checked) => setShowAdvanced(checked as boolean)}
                        className="border-slate-600"
                    />
                    <Label htmlFor="advanced" className="text-slate-300 text-sm">
                        Advanced Features
                    </Label>
                </div>

                {showAdvanced && (
                    <div className="space-y-3 pl-6 border-l-2 border-slate-600">
                        <div className="space-y-2">
                            <Label htmlFor="version" className="text-slate-300 text-sm">Version</Label>
                            <Input
                                id="version"
                                value={version}
                                onChange={(e) => setVersion(e.target.value)}
                                placeholder="e.g., 00"
                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="hashbytes" className="text-slate-300 text-sm">Hash Bytes</Label>
                            <Input
                                id="hashbytes"
                                value={hashbytes}
                                onChange={(e) => setHashbytes(e.target.value)}
                                placeholder="e.g., 0000000000000000000000000000000000000000"
                                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="flex gap-2">
                <PrimaryButton
                    variant="outline"
                    className="flex-1 bg-slate-600 hover:bg-slate-700 border-slate-500 text-white"
                    disabled={isLoading}
                    onClick={resetForm}
                >
                    Reset
                </PrimaryButton>
                <PrimaryButton
                    className="flex-1"
                    disabled={!amount || !recipient || !walletId || isLoading || (action === 'delegate' && isAmountInvalid)}
                    onClick={handleExecuteAction}
                >
                    {isLoading ? "Executing..." : "Execute Action"}
                </PrimaryButton>
            </div>
        </div>
    )
}

export default DelegateStx