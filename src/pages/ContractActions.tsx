
import WalletLayout from "@/components/WalletLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet } from "lucide-react";
import { useState } from "react";

const ContractActions = () => {
  const [contractAddress, setContractAddress] = useState("");
  const [functionName, setFunctionName] = useState("");
  const [functionArgs, setFunctionArgs] = useState("");

  return (
    <WalletLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Contract Actions</h1>
          <p className="text-slate-400">Interact with smart contracts on the Stacks blockchain.</p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Wallet className="mr-2 h-5 w-5 text-purple-400" />
              Call Contract Function
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="contract" className="text-slate-300">Contract Address</Label>
              <Input
                id="contract"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder="SP1ABC...XYZ.contract-name"
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="function" className="text-slate-300">Function Name</Label>
              <Input
                id="function"
                value={functionName}
                onChange={(e) => setFunctionName(e.target.value)}
                placeholder="transfer, mint, burn, etc."
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="args" className="text-slate-300">Function Arguments</Label>
              <Textarea
                id="args"
                value={functionArgs}
                onChange={(e) => setFunctionArgs(e.target.value)}
                placeholder='["recipient-address", u100, "memo"]'
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 min-h-24"
              />
              <p className="text-slate-400 text-xs">Enter arguments as a JSON array</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Transaction Type</Label>
              <Select>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue placeholder="Select transaction type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 text-white shadow-lg">
                  <SelectItem value="readonly" className="text-white hover:bg-slate-700 focus:bg-slate-700 focus:text-white">Read-only Call</SelectItem>
                  <SelectItem value="transaction" className="text-white hover:bg-slate-700 focus:bg-slate-700 focus:text-white">State-changing Transaction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={!contractAddress || !functionName}
            >
              Execute Contract Call
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Popular Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                <div>
                  <div className="text-white font-medium">Stacks Token (STX)</div>
                  <div className="text-slate-400 text-sm">SP000...STX-TOKEN</div>
                </div>
                <Button size="sm" variant="outline" className="border-slate-600" onClick={() => setContractAddress("SP000...STX-TOKEN")}>
                  Use
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                <div>
                  <div className="text-white font-medium">Wrapped Bitcoin</div>
                  <div className="text-slate-400 text-sm">SP3DX3...WRAPPED-BITCOIN</div>
                </div>
                <Button size="sm" variant="outline" className="border-slate-600" onClick={() => setContractAddress("SP3DX3...WRAPPED-BITCOIN")}>
                  Use
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                <div>
                  <div className="text-white font-medium">NFT Collection</div>
                  <div className="text-slate-400 text-sm">SP2J6Z...NFT-COLLECTION</div>
                </div>
                <Button size="sm" variant="outline" className="border-slate-600" onClick={() => setContractAddress("SP2J6Z...NFT-COLLECTION")}>
                  Use
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-900/20 border-yellow-700/50">
          <CardContent className="p-6">
            <div className="space-y-2">
              <h3 className="text-yellow-300 font-medium">Contract Interaction Safety</h3>
              <ul className="text-yellow-200 text-sm space-y-1">
                <li>• Always verify the contract address before calling functions</li>
                <li>• Use read-only calls to preview state changes</li>
                <li>• Double-check function arguments and their types</li>
                <li>• Be aware that state-changing calls require transaction fees</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </WalletLayout>
  );
};

export default ContractActions;
