
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Book, Code, HelpCircle } from "lucide-react";
import SecondaryButton from "../ui/secondary-button";
import { DOCS_URL } from "@/lib/const";

const ExternalLinksSection = () => {
  return (
    <section className="py-20 bg-slate-800/30">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Resources & Support
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Access comprehensive resources and get the support you need to succeed with Smart Wallet.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="p-8 flex flex-col items-center text-center space-y-6 h-full">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center">
                <Book className="h-8 w-8 text-purple-400" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-xl font-semibold text-white">Guides</h3>
                <p className="text-slate-400 text-sm">
                  Explore our detailed user materials
                </p>
              </div>
              <SecondaryButton className="w-full" asChild>
                <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">Learn more</a>
              </SecondaryButton>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="p-8 flex flex-col items-center text-center space-y-6 h-full">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center">
                <Code className="h-8 w-8 text-purple-400" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-xl font-semibold text-white">Developer Docs</h3>
                <p className="text-slate-400 text-sm">
                  Power your app with Smart Wallet APIs
                </p>
              </div>
              <SecondaryButton className="w-full" disabled>
                Under development
              </SecondaryButton>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardContent className="p-8 flex flex-col items-center text-center space-y-6 h-full">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center">
                <HelpCircle className="h-8 w-8 text-purple-400" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-xl font-semibold text-white">Expert Support</h3>
                <p className="text-slate-400 text-sm">
                  Get help from our team around the clock
                </p>
              </div>
              <SecondaryButton className="w-full">
                Contact us
              </SecondaryButton>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ExternalLinksSection;
