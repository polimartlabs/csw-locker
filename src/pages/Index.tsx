
import UnifiedHeader from "@/components/UnifiedHeader";
import BetaNotice from "@/components/landing/BetaNotice";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import FAQSection from "@/components/landing/FAQSection";
import ExternalLinksSection from "@/components/landing/ExternalLinksSection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <UnifiedHeader variant="landing" />
      <BetaNotice />
      <HeroSection />
      <FeaturesSection />
      <FAQSection />
      <ExternalLinksSection />
      <Footer />
    </div>
  );
};

export default Index;
