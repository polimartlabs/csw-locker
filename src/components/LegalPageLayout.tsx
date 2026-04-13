import { Card, CardContent } from "@/components/ui/card";
import PrimaryButton from "@/components/ui/primary-button";
import { Wallet } from "lucide-react";
import { ReactNode } from "react";
import { Link } from "react-router-dom";

interface LegalPageLayoutProps {
    title: string;
    lastUpdated: string;
    children: ReactNode;
}

const LegalPageLayout = ({ title, lastUpdated, children }: LegalPageLayoutProps) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Header */}
            <header className="border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 py-4">
                    <nav className="flex items-center justify-between">
                        <Link to="/" className="flex items-center space-x-2">
                            <Wallet className="h-8 w-8 text-purple-400" />
                            <span className="text-xl font-bold text-white">Smart Wallet</span>
                        </Link>
                        <div className="flex items-center space-x-4">
                            <PrimaryButton asChild >
                                <Link to="/">Back to Home</Link>
                            </PrimaryButton>
                        </div>
                    </nav>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center space-y-4 mb-12">
                        <h1 className="text-4xl lg:text-5xl font-bold text-white">
                            {title}
                        </h1>
                        <p className="text-slate-400">
                            Last updated: {lastUpdated}
                        </p>
                    </div>

                    <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
                        <CardContent className="p-8 space-y-8">
                            {children}
                        </CardContent>
                    </Card>

                    <div className="text-center mt-12">
                        <PrimaryButton asChild size="lg">
                            <Link to="/">Back to Home</Link>
                        </PrimaryButton>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LegalPageLayout;