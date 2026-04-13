import { Link } from "react-router-dom";
import { ArrowUpRight, ArrowDownLeft, TrendingUp, Activity, ExternalLink, Clock, FileCode, RefreshCw, Send, Wallet, History } from "lucide-react";
import { TxInfo } from "@/services/interfaces";
import { formatAmount } from "@/lib/txFormatUtils";
import { getClientConfig } from "@/utils/chain-config";

interface TransactionItemProps {
    tx: TxInfo;
    stxUsd?: number | null;
    walletId?: string;
    assetDecimals?: Record<string, number>;
    showFullDetails?: boolean;
}

export const getTxLabel = (tx: TxInfo, asset?: string) => {
    if (tx.action === 'sent') return asset ? `Send ${asset}` : 'Send';
    if (tx.action === 'receive') return asset ? `Receive ${asset}` : 'Receive';
    if (tx.action === 'contract_call') return `Contract Call`;
    if (tx.action === 'contract_deploy') return `Contract Deploy`;
    if (tx.action === 'delegate_stx') return `Stacking`;
    return tx.action?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Other';
};

const TransactionItem = ({
    tx,
    stxUsd,
    walletId,
    assetDecimals = {},
    showFullDetails = false
}: TransactionItemProps) => {
    const config = walletId ? getClientConfig(walletId) : null;

    const getActivityIcon = (action: TxInfo["action"], tx_type?: string) => {
        if (action === "sent") return Send;
        if (action === "receive") return Send;
        if (action === "contract_call" || action === "contract_deploy" ||
            tx_type === "contract_call" || tx_type === "smart_contract")
            return FileCode;
        if (action === "delegate_stx") return TrendingUp;
        return History;
    };

    const getActivityColor = (action: TxInfo["action"]) => {
        switch (action) {
            case 'sent':
            case 'withdraw':
                return 'text-red-400';
            case 'receive':
            case 'deposit':
                return 'text-green-400';
            case 'delegate_stx':
                return 'text-purple-400';
            case 'transfer_wallet':
                return 'text-blue-400';
            default:
                return 'text-slate-400';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success':
            case 'confirmed':
                return 'text-green-400';
            case 'pending':
                return 'text-yellow-400';
            case 'failed':
                return 'text-red-400';
            default:
                return 'text-slate-400';
        }
    };

    const getDecimalPlaces = (symbol: string) => {
        return assetDecimals[symbol] ?? (symbol === 'SBTC' ? 8 : 6);
    };

    const Icon = getActivityIcon(tx.action, tx.tx_type);
    const activityColor = getActivityColor(tx.action);
    const statusColor = getStatusColor(tx.tx_status);
    const asset = tx.assets[0]?.symbol || 'STX';
    const amount = tx.assets[0]?.amount || '0';
    const amountPrefix = tx.action === "sent" ? '-' : tx.action === "receive" ? '+' : ''
    const isSmartContractCall = tx.tx_type === 'contract_call' || tx.tx_type === 'smart_contract';
    const isContractDeploy = tx.action === 'contract_deploy';
    const showAmount = (isSmartContractCall && amount && amount !== "0") ||
        tx.action === "sent" || tx.action === "receive" || tx.action === "deposit" || tx.action === "withdraw";
    return (
        <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors">
            <div className="flex items-center space-x-3">
                <div className={`${showFullDetails ? 'w-10 h-10' : 'w-8 h-8'} rounded-full ${showFullDetails ? 'bg-slate-600/20' : 'bg-slate-600/50'} flex items-center justify-center`}>
                    <Icon className={`${showFullDetails ? 'h-5 w-5' : 'h-4 w-4'} ${tx.action === 'receive' ? 'text-green-400 rotate-180' : activityColor}`} />
                </div>
                <div>
                    <div className="text-white font-medium capitalize">
                        <>
                            {getTxLabel(tx, asset)}
                        </>
                    </div>

                    {showFullDetails ? (
                        <>
                            <div className="text-slate-400 text-sm whitespace-pre-line">
                                {tx.action === 'sent' || tx.action === "transfer_wallet"
                                    ? <>
                                        <span className={`hidden md:block ${activityColor}`}>To: {tx.actor}</span>
                                        <span className={`block md:hidden ${activityColor}`}>To: {`${tx.actor.slice(0, 4)}...${tx.actor.slice(-4)}`}</span>
                                    </>
                                    : tx.action === "contract_deploy" ? <>
                                        <span className={`hidden md:block ${activityColor}`}>By: {tx.actor}</span>
                                        <span className={`block md:hidden ${activityColor}`}>By: {`${tx.actor.slice(0, 4)}...${tx.actor.slice(-4)}`}</span>
                                    </> : <>
                                        <span className={`hidden md:block ${activityColor}`}>From: {tx.actor}</span>
                                        <span className={`block md:hidden ${activityColor}`}>From: {`${tx.actor.slice(0, 4)}...${tx.actor.slice(-4)}`}</span>
                                    </>}
                                {' • '}{tx.stamp}
                            </div>
                            <div className="text-slate-500 text-xs flex items-center gap-2 hidden md:flex">
                                TX: {tx.tx}
                                {config && (
                                    <Link to={`${config.explorer(`txid/${tx.tx}`)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-slate-400 hover:text-white">
                                        <ExternalLink className="w-4 h-4 text-slate-400 hover:text-white" />
                                    </Link>
                                )}
                            </div>
                            <div className="text-slate-500 text-xs flex items-center gap-2 flex md:hidden">
                                TX: {`${tx.tx.slice(0, 4)}...${tx.tx.slice(-4)}`}
                                {config && (
                                    <Link to={`${config.explorer(`txid/${tx.tx}`)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-slate-400 hover:text-white">
                                        <ExternalLink className="w-4 h-4 text-slate-400 hover:text-white" />
                                    </Link>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-slate-400 text-sm">{tx.stamp}</div>
                    )}
                </div>
            </div>
            <div className="text-right">
                {showAmount && (
                    <div className={`font-medium ${activityColor}`}>
                        {amountPrefix}{formatAmount(amount, getDecimalPlaces(asset))} {asset}
                        {asset === 'STX' && stxUsd && (
                            <span className="text-xs text-slate-400 ml-2">
                                (${((Number(amount) / Math.pow(10, getDecimalPlaces(asset))) * stxUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })} USD)
                            </span>
                        )}
                    </div>
                )}
                <div className={`text-sm capitalize ${statusColor}`}>
                    {tx.tx_status}
                </div>
            </div>
        </div>
    );
};

export default TransactionItem;