
import WalletLayout from "@/components/WalletLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowUp } from "lucide-react";
import { useState } from "react";

const Stacking = () => {
  const [stackingAmount, setStackingAmount] = useState("");
  const [cycles, setCycles] = useState("");

  return (
    <WalletLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">STX Stacking</h1>
          <p className="text-slate-400">Earn Bitcoin rewards by stacking your STX tokens.</p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <ArrowUp className="mr-2 h-5 w-5 text-green-400" />
              Stack STX Tokens
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-slate-300">STX Amount to Stack</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  value={stackingAmount}
                  onChange={(e) => setStackingAmount(e.target.value)}
                  placeholder="Minimum: 125,000 STX"
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 pr-16"
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300"
                  onClick={() => setStackingAmount("1234")}
                >
                  MAX
                </Button>
              </div>
              <p className="text-slate-400 text-xs">Available: 1,234.56 STX</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cycles" className="text-slate-300">Number of Cycles</Label>
              <Input
                id="cycles"
                type="number"
                value={cycles}
                onChange={(e) => setCycles(e.target.value)}
                placeholder="1-12 cycles"
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
              <p className="text-slate-400 text-xs">Each cycle is approximately 2 weeks</p>
            </div>

            <div className="bg-slate-700/30 p-4 rounded-lg space-y-3">
              <h4 className="text-white font-medium">Stacking Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated BTC Rewards:</span>
                  <span className="text-green-400">~0.0015 BTC per cycle</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lock Duration:</span>
                  <span className="text-white">{cycles ? `${cycles} cycles (~${Number(cycles) * 2} weeks)` : "Select cycles"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Current APY:</span>
                  <span className="text-green-400">~8.5%</span>
                </div>
              </div>
            </div>

            <Button 
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={!stackingAmount || !cycles}
            >
              <ArrowUp className="mr-2 h-4 w-4" />
              Start Stacking
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Active Stacking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-slate-400">No active stacking found</p>
              <p className="text-slate-500 text-sm mt-2">Start stacking STX to earn Bitcoin rewards</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-900/20 border-orange-700/50">
          <CardContent className="p-6">
            <div className="space-y-2">
              <h3 className="text-orange-300 font-medium">Important Information</h3>
              <ul className="text-orange-200 text-sm space-y-1">
                <li>• Minimum stacking amount: 125,000 STX (solo stacking)</li>
                <li>• Tokens will be locked for the selected number of cycles</li>
                <li>• BTC rewards are distributed automatically</li>
                <li>• You can delegate to a stacking pool if you have less than 125,000 STX</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </WalletLayout>
  );
};

export default Stacking;
