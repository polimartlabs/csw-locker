
import { Card, CardContent } from "@/components/ui/card";
import { Send, Wallet, Shield } from "lucide-react";

const FeaturesSection = () => {
  return (
    <section id="features-section" className="py-20 bg-slate-800/30">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Key Features
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Our Smart Wallet provides a range of features to enhance your asset management experience.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto">
                <Send className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Key Rotation</h3>
              <p className="text-slate-400 text-sm">
                Update or change private keys without needing to manually transfer each asset individually.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto">
                <Wallet className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Asset Management</h3>
              <p className="text-slate-400 text-sm">
                Conduct operations such as sending, staking, and managing assets within the smart wallet environment.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto">
                <Shield className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Enhanced Security</h3>
              <p className="text-slate-400 text-sm">
                Set transfer limits and recovery mechanisms to protect your assets from unauthorized access.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
