import { Bitcoin, Copy, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import PrimaryButton from "@/components/ui/primary-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const cellBase =
  "rounded-lg border bg-slate-800/40 px-3 py-1.5 min-w-[9.5rem] sm:min-w-[11rem] max-w-[14rem] flex-1";

type StripProps = {
  showStxCell?: boolean;
  stxBalance: string;
  stxUsd: string;
  stxAddress: string | null;
  onCopyStx: () => void;
  copiedStx: boolean;
  btcBtcDisplay: string;
  btcUsd: string;
  btcAddress: string | null;
  onCopyBtc: () => void;
  copiedBtc: boolean;
  btcLoading: boolean;
  onConnectBtc: () => void;
  btcConnecting: boolean;
  showBtcAddressRow: boolean;
  onUnlinkBtc?: () => void;
  showUnlink?: boolean;
};

export function HeaderAssetBalanceStrip({
  showStxCell = true,
  stxBalance,
  stxUsd,
  stxAddress,
  onCopyStx,
  copiedStx,
  btcBtcDisplay,
  btcUsd,
  btcAddress,
  onCopyBtc,
  copiedBtc,
  btcLoading,
  onConnectBtc,
  btcConnecting,
  showBtcAddressRow,
  onUnlinkBtc,
  showUnlink,
}: StripProps) {
  return (
    <div className="flex flex-1 min-w-0 items-center justify-end gap-2 sm:gap-2.5">
      {showStxCell && (
      <div className={`${cellBase} border-slate-700/80`}>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 leading-none">STX</div>
        <div className="mt-0.5 flex items-end justify-between gap-2 min-w-0">
          <span className="text-sm sm:text-base font-extrabold text-white tabular-nums leading-none truncate">{stxBalance}</span>
          <div className="flex flex-col items-end shrink-0">
            <span className="text-[9px] font-medium uppercase tracking-wide text-slate-500 leading-none">USD</span>
            <span className="text-xs font-bold text-green-400 tabular-nums leading-none mt-0.5">{stxUsd}</span>
          </div>
        </div>
        {stxAddress && (
          <div className="mt-1 flex items-center gap-1 min-w-0">
            <span className="font-mono text-[9px] text-slate-400 truncate min-w-0" title={stxAddress}>
              {stxAddress.length > 18 ? `${stxAddress.slice(0, 7)}…${stxAddress.slice(-4)}` : stxAddress}
            </span>
            <button
              type="button"
              className="shrink-0 p-0.5 rounded hover:bg-slate-700/80"
              onClick={onCopyStx}
              aria-label="Copy STX address"
            >
              {copiedStx ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3 text-slate-500" />}
            </button>
          </div>
        )}
      </div>
      )}

      <div className={`${cellBase} border-amber-900/35`}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-200/80 flex items-center gap-1 leading-none">
            <Bitcoin className="h-3 w-3 text-amber-400" />
            BTC
          </div>
          {showUnlink && onUnlinkBtc && (
            <button type="button" className="text-[9px] text-purple-400 hover:underline p-0" onClick={onUnlinkBtc}>
              Unlink
            </button>
          )}
        </div>
        {btcLoading && btcAddress ? (
          <Skeleton className="h-5 w-24 mt-0.5" />
        ) : btcAddress ? (
          <>
            <div className="mt-0.5 flex items-end justify-between gap-2 min-w-0">
              <span className="text-sm sm:text-base font-extrabold text-white tabular-nums leading-none truncate">
                {btcBtcDisplay}
                <span className="text-[10px] font-bold text-amber-200/80"> BTC</span>
              </span>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[9px] font-medium uppercase tracking-wide text-slate-500 leading-none">USD</span>
                <span className="text-xs font-bold text-amber-200 tabular-nums leading-none mt-0.5">{btcUsd}</span>
              </div>
            </div>
            {showBtcAddressRow && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mt-1 flex items-center gap-1 min-w-0 cursor-default">
                    <span className="font-mono text-[9px] text-slate-400 truncate min-w-0">
                      {btcAddress.length > 18 ? `${btcAddress.slice(0, 7)}…${btcAddress.slice(-4)}` : btcAddress}
                    </span>
                    <button
                      type="button"
                      className="shrink-0 p-0.5 rounded hover:bg-slate-700/80"
                      onClick={onCopyBtc}
                      aria-label="Copy Bitcoin address"
                    >
                      {copiedBtc ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3 text-slate-500" />}
                    </button>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs bg-slate-900 border-slate-600 text-slate-200 text-xs"
                >
                  Bitcoin address from your connected Stacks wallet (e.g. Leather). This is the L1 address used for
                  your balance and sends.
                </TooltipContent>
              </Tooltip>
            )}
          </>
        ) : (
          <div className="mt-1">
            <PrimaryButton
              className="h-6 w-full min-h-0 text-[10px] font-semibold py-0 px-2"
              onClick={onConnectBtc}
              disabled={btcConnecting}
            >
              {btcConnecting ? "…" : "Connect"}
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}
