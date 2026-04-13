import { Button } from "@/components/ui/button";
import SecondaryButton from "@/components/ui/secondary-button"; // Add this import if not present
import PrimaryButton from "@/components/ui/primary-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Users, Shield, DollarSign, Vote, Target, ArrowRight, Check, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const Products = () => {
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
              <SecondaryButton asChild >
                <Link to="/">Home</Link>
              </SecondaryButton>
              <SecondaryButton asChild >
                <Link to="/about">About</Link>
              </SecondaryButton>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center space-y-8 mb-16">
          <div className="inline-block">
            <span className="bg-purple-600/20 text-purple-300 px-3 py-1 rounded-full text-sm font-medium">
              Smart Wallet Products
            </span>
          </div>

          <div className="space-y-6">
            <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
              Choose Your
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Smart Wallet
              </span>
              <br />
              Solution
            </h1>

            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Whether you're an individual managing personal assets or an organization coordinating complex operations, we have the perfect smart wallet solution for your needs.
            </p>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Personal Wallet */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm overflow-hidden flex flex-col h-full">
            <CardHeader className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-600/30 rounded-full flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-white">Personal Wallet</CardTitle>
                  <p className="text-slate-400">For individual users and families</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6 flex-1 flex flex-col">
              <p className="text-slate-300">
                Perfect for day-to-day asset management with advanced security features and family-friendly inheritance planning.
              </p>

              <div className="space-y-4 flex-1">
                <h4 className="text-lg font-semibold text-white">Key Features:</h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="text-white font-medium">Day-to-Day Management</h5>
                      <p className="text-slate-400 text-sm">Seamless sending, receiving, and managing of digital assets with intuitive controls.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="text-white font-medium">Inheritance Planning</h5>
                      <p className="text-slate-400 text-sm">Set up beneficiaries and recovery mechanisms to ensure your assets are protected for future generations.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="text-white font-medium">Spending Limits</h5>
                      <p className="text-slate-400 text-sm">Configure daily, weekly, or monthly spending limits to maintain financial discipline and security.</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="text-white font-medium">Multi-Signature Security</h5>
                      <p className="text-slate-400 text-sm">Add family members as co-signers for enhanced security on large transactions using Asigna Multisig wallet.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  <span className="text-slate-300">Starting from $0 - Pay only for transactions</span>
                </div>

                <PrimaryButton asChild className="w-full">
                  <Link to="/create-wallet?type=personal">
                    Get Personal Wallet
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </PrimaryButton>
              </div>
            </CardContent>
          </Card>

          {/* Project Smart Wallet */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm overflow-hidden flex flex-col h-full">
            <CardHeader className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-b border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-600/30 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-white">Project Smart Wallet</CardTitle>
                  <p className="text-slate-400">For teams, groups, and project admins</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6 flex-1 flex flex-col">
              <p className="text-slate-300">
                Ideal for collaborative projects, enabling secure group management of funds, milestone-based payouts, and transparent decision-making.
              </p>

              <div className="space-y-4 flex-1">
                <h4 className="text-lg font-semibold text-white">Key Benefits:</h4>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="text-white font-medium">Milestone-Based Fund Release</h5>
                      <p className="text-slate-400 text-sm">Funds are released as project milestones are completed and approved, ensuring accountability.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="text-white font-medium">Collaborative Spending Controls</h5>
                      <p className="text-slate-400 text-sm">Require multiple approvals for large transactions to enhance security and group consensus.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="text-white font-medium">Role-Based Permissions</h5>
                      <p className="text-slate-400 text-sm">Assign roles to team members for flexible and secure wallet management.</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="text-white font-medium">Budget Tracking & Reporting</h5>
                      <p className="text-slate-400 text-sm">Monitor project budgets and expenses in real time with transparent reporting.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Target className="h-5 w-5 text-blue-400" />
                  <span className="text-slate-300">Enterprise pricing - Contact for quote</span>
                </div>


                <PrimaryButton asChild className="w-full"
                  disabled>
                  <Link to="/create-wallet?type=project">
                    <div className="flex items-center space-x-1 px-2 py-1 bg-slate-600/50 rounded-full">
                      <Clock className="h-3 w-3 text-slate-400" />
                      <span className="text-xs text-slate-400">Coming Soon</span>
                    </div>
                    {/*
                    Get Project Wallet
                    <ArrowRight className="ml-2 h-4 w-4" />
                    */}
                  </Link>
                </PrimaryButton>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Section */}
        <section className="bg-slate-800/30 rounded-2xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-center text-white mb-8">Feature Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="pb-4 text-slate-400 font-medium">Feature</th>
                  <th className="pb-4 text-center text-purple-400 font-medium">Personal</th>
                  <th className="pb-4 text-center text-blue-400 font-medium">Project</th>
                </tr>
              </thead>
              <tbody className="space-y-4">
                <tr className="border-b border-slate-700/50">
                  <td className="py-3 text-white">Basic Asset Management</td>
                  <td className="py-3 text-center"><Check className="h-5 w-5 text-green-400 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="h-5 w-5 text-green-400 mx-auto" /></td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-3 text-white">Spending Limits</td>
                  <td className="py-3 text-center"><Check className="h-5 w-5 text-green-400 mx-auto" /></td>
                  <td className="py-3 text-center"><Check className="h-5 w-5 text-green-400 mx-auto" /></td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-3 text-white">Inheritance Planning</td>
                  <td className="py-3 text-center"><Check className="h-5 w-5 text-green-400 mx-auto" /></td>
                  <td className="py-3 text-center text-slate-500">-</td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-3 text-white">Milestone Tracking</td>
                  <td className="py-3 text-center text-slate-500">-</td>
                  <td className="py-3 text-center"><Check className="h-5 w-5 text-green-400 mx-auto" /></td>
                </tr>
                <tr>
                  <td className="py-3 text-white">Treasury Management</td>
                  <td className="py-3 text-center text-slate-500">-</td>
                  <td className="py-3 text-center"><Check className="h-5 w-5 text-green-400 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center space-y-8">
          <h2 className="text-4xl font-bold text-white">Ready to Deploy Your Smart Wallet?</h2>
          <p className="text-slate-300 max-w-2xl mx-auto">
            Join the future of digital asset management with our secure, scalable smart wallet solutions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <PrimaryButton asChild size="lg">
              <Link to="/wallet-selector">
                Get Started Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </PrimaryButton>
            <SecondaryButton asChild size="lg" >
              <Link to="/about">Learn More</Link>
            </SecondaryButton>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Products;
