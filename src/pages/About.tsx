import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SecondaryButton from "@/components/ui/secondary-button";
import PrimaryButton from "@/components/ui/primary-button";
import { Wallet, Users, Shield, Code, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const About = () => {
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
                <Link to="/products">View Products</Link>
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
              About Smart Wallet
            </span>
          </div>

          <div className="space-y-6">
            <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
              Revolutionizing
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Blockchain
              </span>
              <br />
              Asset Management
            </h1>

            <p className="text-xl text-slate-300 max-w-3xl mx-auto">
              Smart Wallet is at the forefront of blockchain innovation, providing secure, scalable, and user-friendly smart contract wallet solutions for individuals and organizations worldwide.
            </p>
          </div>
        </div>

        {/* Mission Section */}
        <section className="py-16 bg-slate-800/30 rounded-2xl mb-16">
          <div className="max-w-4xl mx-auto text-center space-y-8 px-8">
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Our Mission
            </h2>
            <p className="text-lg text-slate-300">
              We believe that blockchain technology should be accessible to everyone. Our mission is to eliminate the complexity barriers that prevent users from fully embracing decentralized finance and digital asset management.
            </p>
            <p className="text-slate-400">
              By providing intuitive smart wallet solutions, we're empowering users to take control of their digital assets with confidence and security, whether they're individuals managing personal wealth or organizations coordinating complex financial operations.
            </p>
          </div>
        </section>

        {/* Values Grid */}
        <section className="mb-16">
          <h2 className="text-4xl font-bold text-center text-white mb-12">Our Values</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto">
                  <Shield className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Security First</h3>
                <p className="text-slate-400 text-sm">
                  Every feature is built with security as the foundation, protecting user assets with advanced encryption and smart contract audits.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto">
                  <Users className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">User-Centric</h3>
                <p className="text-slate-400 text-sm">
                  We design with users in mind, creating intuitive interfaces that make complex blockchain operations simple and accessible.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto">
                  <Code className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Innovation</h3>
                <p className="text-slate-400 text-sm">
                  We continuously push the boundaries of what's possible in blockchain technology, delivering cutting-edge solutions.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto">
                  <Wallet className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold text-white">Transparency</h3>
                <p className="text-slate-400 text-sm">
                  Open-source development and clear communication ensure users understand and trust our platform completely.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center space-y-8 bg-slate-800/30 rounded-2xl py-16">
          <h2 className="text-4xl font-bold text-white">Ready to Get Started?</h2>
          <p className="text-slate-300 max-w-2xl mx-auto">
            Join thousands of users who trust Smart Wallet for their blockchain asset management needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <PrimaryButton asChild size="lg">
              <Link to="/products">
                Explore Products
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </PrimaryButton>
            <SecondaryButton asChild size="lg" >
              <Link to="/">Learn More</Link>
            </SecondaryButton>
          </div>
        </section>
      </main>
    </div>
  );
};

export default About;
