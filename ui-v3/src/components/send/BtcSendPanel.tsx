import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PrimaryButton from "@/components/ui/primary-button";
import { useBtcWallet } from "@/contexts/BtcWalletContext";
import {
  getRecommendedFeerates,
  pickFeerateSatPerVb,
  feePresetLabel,
  getBitcoinTxExplorerUrl,
} from "@/services/bitcoinTxService";
import { request as stacksRequest, JsonRpcError, JsonRpcErrorCode } from "@stacks/connect";
import { getClientConfig } from "@/utils/chain-config";
import { useToast } from "@/components/ui/use-toast";
import { Bitcoin, ExternalLink, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const BtcSendPanel = () => {
  const { activeBtcAddress, connectBtcWallet, connecting, refreshBtc } = useBtcWallet();
  const { toast } = useToast();
  const [recipient, setRecipient] = useState("");
  const [amountBtc, setAmountBtc] = useState("");
  const [feeLoading, setFeeLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [fees, setFees] = useState<Awaited<ReturnType<typeof getRecommendedFeerates>>>(null);
  const [lastTxid, setLastTxid] = useState<string | null>(null);

  const preset = "halfHour" as const;

  useEffect(() => {
    if (!activeBtcAddress) {
      setFeeLoading(false);
      return;
    }
    let k = true;
    setFeeLoading(true);
    void getRecommendedFeerates(activeBtcAddress).then((f) => {
      if (k) {
        setFees(f);
        setFeeLoading(false);
      }
    });
    return () => {
      k = false;
    };
  }, [activeBtcAddress]);

  const sats = Math.round(parseFloat(amountBtc || "0") * 1e8);
  const feerate = fees ? pickFeerateSatPerVb(fees, preset) : null;

  const onSend = async () => {
    if (!activeBtcAddress) return;
    if (!recipient || !sats || sats <= 0) {
      toast({ title: "Check inputs", description: "Enter recipient and a valid amount.", variant: "destructive" });
      return;
    }
    setSending(true);
    setLastTxid(null);
    try {
      const network = getClientConfig(activeBtcAddress).network;
      const res = await stacksRequest("sendTransfer", {
        recipients: [{ address: recipient, amount: sats }],
        network,
      });
      if (res?.txid) {
        setLastTxid(res.txid);
        toast({ title: "Transaction sent" });
        void refreshBtc();
      } else {
        toast({ title: "No txid returned", description: "Wallet did not return a transaction id.", variant: "destructive" });
      }
    } catch (e) {
      if (
        e instanceof JsonRpcError &&
        (e.code === JsonRpcErrorCode.UserRejection || e.code === JsonRpcErrorCode.UserCanceled)
      ) {
        toast({ title: "Cancelled" });
      } else if (e instanceof JsonRpcError) {
        console.error("sendTransfer failed", e);
        toast({
          title: "Send failed",
          description: [e.message, e.data].filter(Boolean).join(" · ") || "Wallet returned an RPC error.",
          variant: "destructive",
        });
      } else {
        console.error(e);
        toast({
          title: "Error",
          description: e instanceof Error ? e.message : "Send failed",
          variant: "destructive",
        });
      }
    } finally {
      setSending(false);
    }
  };

  if (!activeBtcAddress) {
    return (
      <Card className="bg-slate-800/50 border-amber-900/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2 text-lg">
            <Bitcoin className="h-5 w-5 text-amber-400" />
            Bitcoin (L1)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-slate-300 text-sm leading-relaxed">
          <p>
            Connect your Stacks wallet to send on the Bitcoin L1 network. Leather (and other Stacks wallets that
            expose a BTC address) work out of the box. You can also use the header{" "}
            <span className="text-amber-200/90">Connect</span> flow.
          </p>
          <PrimaryButton onClick={() => void connectBtcWallet()} disabled={connecting} className="w-full sm:w-auto min-h-10">
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Opening wallet…
              </>
            ) : (
              "Connect Bitcoin wallet"
            )}
          </PrimaryButton>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-white text-lg flex items-center gap-2">
          <Bitcoin className="h-5 w-5 text-amber-400" />
          Send Bitcoin
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Sending from</p>
          <p className="text-sm text-slate-200 font-mono break-all rounded-md bg-slate-900/80 border border-slate-600/60 px-3 py-2">
            {activeBtcAddress}
          </p>
        </div>
        {feeLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : fees ? (
          <p className="text-sm text-slate-400">
            Fee intel: ~{feerate} sat/vB ({feePresetLabel(preset)}). The wallet sets the final fee at confirm time.
          </p>
        ) : (
          <p className="text-sm text-amber-400/80">Could not load Mempool feerates; the wallet will still set a fee.</p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="btc-recipient" className="text-slate-300 text-sm">
            Recipient address
          </Label>
          <Input
            id="btc-recipient"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="bg-slate-900 border-slate-600 text-white font-mono text-sm h-11"
            placeholder="bc1… or tb1…"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="btc-amount" className="text-slate-300 text-sm">
            Amount (BTC)
          </Label>
          <Input
            id="btc-amount"
            type="text"
            inputMode="decimal"
            value={amountBtc}
            onChange={(e) => setAmountBtc(e.target.value)}
            className="bg-slate-900 border-slate-600 text-white h-11 tabular-nums"
            placeholder="0.0001"
            autoComplete="off"
          />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <PrimaryButton onClick={() => void onSend()} disabled={sending} className="min-h-10 min-w-[10rem]">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Confirm in wallet…
              </>
            ) : (
              "Send in wallet"
            )}
          </PrimaryButton>
        </div>
        {lastTxid && (
          <a
            href={getBitcoinTxExplorerUrl(lastTxid, activeBtcAddress)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-purple-400 text-sm hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View on explorer
          </a>
        )}
      </CardContent>
    </Card>
  );
};

export default BtcSendPanel;
