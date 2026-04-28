import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PrimaryButton from "@/components/ui/primary-button";
import SecondaryButton from "@/components/ui/secondary-button";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { saveOnboarding, type AccountKind, type GroupLabel } from "@/lib/onboardingStorage";
import { User, Users } from "lucide-react";

const Onboarding = () => {
  const navigate = useNavigate();
  const { isWalletConnected, connectWallet, isConnecting } = useWalletConnection();
  const [accountKind, setAccountKind] = useState<AccountKind>("personal");
  const [groupLabel, setGroupLabel] = useState<GroupLabel>("dao");

  const finish = () => {
    if (accountKind === "group") {
      saveOnboarding({ accountKind, groupLabel });
    } else {
      saveOnboarding({ accountKind: "personal" });
    }
    navigate("/wallet-selector", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center text-white">
          <h1 className="text-3xl font-bold">Welcome</h1>
          <p className="text-slate-400 mt-2">Connect your wallet and tell us how you use smart wallets.</p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">1. Wallet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isWalletConnected ? (
              <p className="text-green-400 text-sm">Wallet connected. You can continue.</p>
            ) : (
              <p className="text-slate-400 text-sm">Connect a Hiro-compatible wallet (e.g. Leather) for STX and BTC.</p>
            )}
            {!isWalletConnected && (
              <PrimaryButton onClick={() => void connectWallet()} disabled={isConnecting} className="w-full sm:w-auto">
                {isConnecting ? "Opening wallet…" : "Connect wallet"}
              </PrimaryButton>
            )}
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">2. Account type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={accountKind}
              onValueChange={(v) => setAccountKind(v as AccountKind)}
              className="space-y-3"
            >
              <div className="flex items-center space-x-2 rounded-lg border border-slate-700 p-3 has-[:checked]:border-purple-500/60">
                <RadioGroupItem value="personal" id="personal" />
                <Label htmlFor="personal" className="flex-1 cursor-pointer text-slate-200">
                  <span className="inline-flex items-center gap-2 font-medium text-white">
                    <User className="h-4 w-4" /> Personal
                  </span>
                  <span className="block text-sm text-slate-400">Individual use, single decision-maker.</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border border-slate-700 p-3 has-[:checked]:border-purple-500/60">
                <RadioGroupItem value="group" id="group" />
                <Label htmlFor="group" className="flex-1 cursor-pointer text-slate-200">
                  <span className="inline-flex items-center gap-2 font-medium text-white">
                    <Users className="h-4 w-4" /> Group
                  </span>
                  <span className="block text-sm text-slate-400">DAO, dev team, or institution — for tailored policy UX later.</span>
                </Label>
              </div>
            </RadioGroup>

            {accountKind === "group" && (
              <div>
                <Label className="text-slate-400">Label (optional, stored locally)</Label>
                <Select value={groupLabel} onValueChange={(v) => setGroupLabel(v as GroupLabel)}>
                  <SelectTrigger className="mt-1 bg-slate-900 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dao">DAO</SelectItem>
                    <SelectItem value="dev_team">Dev team</SelectItem>
                    <SelectItem value="institution">Institution</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <SecondaryButton asChild>
            <Link to="/">Back home</Link>
          </SecondaryButton>
          <PrimaryButton onClick={finish} disabled={!isWalletConnected}>
            Continue to wallets
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
