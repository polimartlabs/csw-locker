
import { Card, CardContent } from "@/components/ui/card";
import { Play } from "lucide-react";

const Notice = () => {
  return (
    <Card className="bg-blue-600/10 border-blue-600/30">
      <CardContent className="p-6">
        <div className="flex items-start space-x-3">
          <Play className="h-5 w-5 text-blue-400 mt-0.5" />
          <div>
            <h3 className="text-blue-300 font-semibold mb-1">Demo Mode Active</h3>
            <p className="text-blue-200/80 text-sm">
              You're currently exploring with demo data. This wallet contains simulated transactions and balances to showcase the platform's capabilities. 
              To manage real assets, connect your actual wallet.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Notice;
