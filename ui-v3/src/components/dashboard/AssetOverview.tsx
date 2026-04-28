import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, Bitcoin, Coins, Image, TrendingUp, View } from "lucide-react";
import { formatBtcFromSats, formatNumber } from "@/utils/numbers";
import { useAccountBalanceService } from "@/hooks/useAccountBalanceService";
import { Button } from "../ui/button";
import SecondaryButton from "../ui/secondary-button";
import { Link } from "react-router-dom";
import { Skeleton } from "../ui/skeleton";
import { useBtcWallet } from "@/contexts/BtcWalletContext";
import { useAssetPrices } from "@/contexts/AssetPricesContext";
import PrimaryButton from "../ui/primary-button";
import { useMemo } from "react";
import { computePortfolioUsd } from "@/lib/portfolioUsd";

/**
 * One unified row spec covering every fungible asset we render, so the UI is just a
 * `.map(...)` over a sorted list and total = `Σ row.usdValue`.
 *
 * `usdValue == null` means we have a balance but no price data yet (still loading or
 * failed). It sorts to the bottom of the list so priced assets stay at the top.
 */
type AssetRow = {
	id: string;
	symbol: string;
	name: string;
	icon: React.ReactNode;
	rowClass: string;
	balance: number | null;
	balanceLabel: string;
	balanceFractionDigits: number;
	usdValue: number | null;
	usdPricePerUnit: number | null;
	loading: boolean;
	rightSlot?: React.ReactNode;
};

const numberFmt = (n: number, frac: number) =>
	new Intl.NumberFormat("en-US", {
		maximumFractionDigits: frac,
		minimumFractionDigits: 0,
	}).format(n);

const AssetOverview = ({ smartWalletAddress }: { smartWalletAddress: string; walletAddress?: string }) => {
	const { stxBalance, sBtcBalance, nftBalance, ftBalance, loading } = useAccountBalanceService(smartWalletAddress);
	const { stxUsd, btcUsd, loading: pricesLoading } = useAssetPrices();
	const {
		activeBtcAddress,
		balanceSats,
		loadingBalance: btcLoading,
		connectBtcWallet,
		connecting: btcConnecting,
	} = useBtcWallet();

	const stxRow = useMemo<AssetRow>(() => {
		const balance = stxBalance?.balance ? Number(stxBalance.balance) : null;
		const usdValue = balance != null && stxUsd != null ? balance * stxUsd : null;
		return {
			id: "stx",
			symbol: stxBalance?.symbol || "STX",
			name: "Stacks",
			icon: (
				<div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0">
					<img src="/stx.png" alt="STX" loading="lazy" className="h-full w-full rounded-full" />
				</div>
			),
			rowClass: "bg-slate-700/30 hover:bg-slate-700/50",
			balance,
			balanceLabel: balance != null ? numberFmt(balance, 2) : "0.00",
			balanceFractionDigits: 2,
			usdValue,
			usdPricePerUnit: stxUsd ?? null,
			loading: loading || pricesLoading,
		};
	}, [stxBalance, stxUsd, loading, pricesLoading]);

	const sbtcRow = useMemo<AssetRow>(() => {
		const balance = sBtcBalance?.balance ? Number(sBtcBalance.balance) : null;
		// sBTC trades ~1:1 with BTC, so use the BTC spot price.
		const usdValue = balance != null && btcUsd != null ? balance * btcUsd : null;
		return {
			id: "sbtc",
			symbol: sBtcBalance?.symbol || "sBTC",
			name: "Stacks BTC",
			icon: (
				<div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0">
					<img src="/sbtc.png" alt="sBTC" loading="eager" className="h-full w-full rounded-full" />
				</div>
			),
			rowClass: "bg-slate-700/30 hover:bg-slate-700/50",
			balance,
			balanceLabel: balance != null ? numberFmt(balance, 4) : "0.0000",
			balanceFractionDigits: 4,
			usdValue,
			usdPricePerUnit: btcUsd ?? null,
			loading: loading || pricesLoading,
		};
	}, [sBtcBalance, btcUsd, loading, pricesLoading]);

	const btcRow = useMemo<AssetRow>(() => {
		const balance = balanceSats != null ? balanceSats / 1e8 : null;
		const usdValue = balance != null && btcUsd != null ? balance * btcUsd : null;
		return {
			id: "btc",
			symbol: "BTC",
			name: "Bitcoin (L1)",
			icon: (
				<div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
					<Bitcoin className="h-4 w-4 text-amber-400" />
				</div>
			),
			rowClass: "bg-amber-950/20 border border-amber-900/30 hover:bg-amber-950/30",
			balance,
			balanceLabel: activeBtcAddress && balanceSats != null ? `${formatBtcFromSats(balanceSats)} BTC` : "Not connected",
			balanceFractionDigits: 5,
			usdValue,
			usdPricePerUnit: btcUsd ?? null,
			loading: !!activeBtcAddress && (btcLoading || pricesLoading),
			rightSlot: !activeBtcAddress ? (
				<PrimaryButton
					className="h-7 text-[10px] px-2 py-0"
					onClick={() => void connectBtcWallet()}
					disabled={btcConnecting}
				>
					{btcConnecting ? "…" : "Connect"}
				</PrimaryButton>
			) : (
				<SecondaryButton asChild variant={undefined} className="h-7 text-[10px] px-2">
					<Link to={`/send/${smartWalletAddress}`}>Send</Link>
				</SecondaryButton>
			),
		};
	}, [activeBtcAddress, balanceSats, btcUsd, btcLoading, pricesLoading, btcConnecting, connectBtcWallet, smartWalletAddress]);

	/**
	 * Final list of fungible asset rows, sorted descending by USD value.
	 * Rows with an unknown (null) USD value sink to the bottom so users always see what
	 * they hold by value first, then everything else.
	 */
	const sortedFungibleRows = useMemo(() => {
		return [stxRow, sbtcRow, btcRow].sort((a, b) => {
			const av = a.usdValue ?? -1;
			const bv = b.usdValue ?? -1;
			return bv - av;
		});
	}, [stxRow, sbtcRow, btcRow]);

	const totalUsdValue = useMemo(
		() =>
			computePortfolioUsd({
				stxBalance: stxRow.balance,
				sBtcBalance: sbtcRow.balance,
				btcBalanceSats: balanceSats,
				stxUsd,
				btcUsd,
			}),
		[stxRow.balance, sbtcRow.balance, balanceSats, stxUsd, btcUsd]
	);
	const hasAnyTotal = totalUsdValue > 0;
	const aggregateLoading = loading || pricesLoading || (!!activeBtcAddress && btcLoading);

	return (
		<Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
				<CardTitle className="text-lg font-medium text-white flex items-center">
					<TrendingUp className="mr-2 h-5 w-5 text-purple-400" />
					Asset Overview
				</CardTitle>
				<div className="text-right">
					<div className="text-sm text-slate-400">Total value</div>
					<div className="text-lg font-bold text-green-400">
						{aggregateLoading && !hasAnyTotal ? (
							<Skeleton className="h-7 w-20 ml-auto" />
						) : hasAnyTotal ? (
							`$${formatNumber(totalUsdValue, 2)}`
						) : (
							"$0.00"
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{sortedFungibleRows.map((row) => (
					<div
						key={row.id}
						className={`flex items-center justify-between p-3 rounded-lg transition-colors ${row.rowClass}`}
					>
						<div className="flex items-center space-x-3 min-w-0">
							{row.icon}
							<div className="min-w-0">
								<div className="text-white font-medium">{row.symbol}</div>
								<div className="text-slate-400 text-sm">
									{row.loading ? (
										<Skeleton className="h-3 w-24" />
									) : (
										<span className="font-mono text-xs sm:text-sm">{row.balanceLabel}</span>
									)}
								</div>
							</div>
						</div>
						<div className="text-right flex flex-col items-end gap-1">
							<div className="text-white text-sm font-medium">
								{row.loading ? (
									<Skeleton className="h-4 w-16" />
								) : row.usdValue != null ? (
									<p>${formatNumber(row.usdValue, 2)}</p>
								) : (
									<p className="text-slate-500">—</p>
								)}
							</div>
							{row.usdPricePerUnit != null && (
								<div className="text-[10px] text-slate-500">
									${formatNumber(row.usdPricePerUnit, row.usdPricePerUnit < 1 ? 4 : 2)} / {row.symbol}
								</div>
							)}
							{row.rightSlot}
						</div>
					</div>
				))}

				<div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors">
					<div className="flex items-center space-x-3">
						<div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center">
							<Coins className="h-4 w-4 text-purple-400" />
						</div>
						<div>
							<div className="text-white font-medium">Other tokens</div>
							<div className="text-slate-400 text-sm">
								{loading ? <Skeleton className="h-3 w-4" /> : ftBalance?.length || 0}
							</div>
						</div>
					</div>
					<div className="text-right">
						<SecondaryButton asChild variant={undefined}>
							<Link to={`/send/${smartWalletAddress}`}>
								<ArrowUpRight className="mr-2 h-4 w-4" />
								Send Assets
							</Link>
						</SecondaryButton>
					</div>
				</div>

				<div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg hover:bg-slate-700/50 transition-colors">
					<div className="flex items-center space-x-3">
						<div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center">
							<Image className="h-4 w-4 text-purple-400" />
						</div>
						<div>
							<div className="text-white font-medium">Collectibles</div>
							<div className="text-slate-400 text-sm">
								{loading ? <Skeleton className="h-3 w-4" /> : nftBalance?.length || 0}
							</div>
						</div>
					</div>
					<div className="text-right">
						<Button variant="secondary" className="flex items-center justify-center text-slate-200 bg-slate-800/50">
							<View className="mr-2 h-4 w-4" /> View All
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

export default AssetOverview;
