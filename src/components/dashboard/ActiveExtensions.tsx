
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, CheckCircle } from "lucide-react";
import { ContractType } from "@/data/walletTypes";

interface ActiveExtensionsProps {
  extensions: ContractType[];
}

const ActiveExtensions = ({ extensions }: ActiveExtensionsProps) => {

  return (
    <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-medium text-white flex items-center">
          <Settings className="mr-2 h-5 w-5 text-purple-400" />
          Active Extensions
        </CardTitle>
        <Badge variant="outline" className="border-green-600 text-green-400">
          {extensions.length} Active
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
          {extensions.map((extension, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 bg-slate-700/30 rounded-lg">
              <span className="text-lg">{extension.icon}</span>
              <span className="text-sm text-slate-200">{extension.name}</span>
              <CheckCircle className="h-3 w-3 text-green-400 ml-auto" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActiveExtensions;
