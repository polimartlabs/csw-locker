
import { Card, CardContent } from "@/components/ui/card";

const LoadingState = () => {
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-12 text-center">
        <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-400">Loading your smart wallets...</p>
      </CardContent>
    </Card>
  );
};

export default LoadingState;
