
import LegalPageLayout from "@/components/LegalPageLayout";

const Terms = () => {
  return (
    <LegalPageLayout
      title="Terms & Conditions"
      lastUpdated="June 19, 2025"
    >
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-white">1. Acceptance of Terms</h2>
        <p className="text-slate-300 leading-relaxed">
          By accessing and using Smart Wallet, you accept and agree to be bound by the terms and provision of this agreement.
          If you do not agree to abide by the above, please do not use this service.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-white">2. Use License</h2>
        <p className="text-slate-300 leading-relaxed">
          Permission is granted to temporarily download one copy of Smart Wallet per device for personal,
          non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
        </p>
        <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
          <li>modify or copy the materials</li>
          <li>use the materials for any commercial purpose or for any public display</li>
          <li>attempt to reverse engineer any software contained in Smart Wallet</li>
          <li>remove any copyright or other proprietary notations from the materials</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-white">3. Wallet Security</h2>
        <p className="text-slate-300 leading-relaxed">
          You are responsible for maintaining the security of your wallet and private keys. Smart Wallet does not store
          your private keys and cannot recover them if lost. Always ensure you have secure backups of your recovery phrases.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-white">4. Beta Software</h2>
        <p className="text-slate-300 leading-relaxed">
          Smart Wallet is currently in beta. The software may contain bugs or errors and is provided "as is" without
          warranty of any kind. Use at your own risk and never invest more than you can afford to lose.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-white">5. Disclaimer</h2>
        <p className="text-slate-300 leading-relaxed">
          The materials on Smart Wallet are provided on an 'as is' basis. Smart Wallet makes no warranties,
          expressed or implied, and hereby disclaims and negates all other warranties including without limitation,
          implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement
          of intellectual property or other violation of rights.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-white">6. Limitations</h2>
        <p className="text-slate-300 leading-relaxed">
          In no event shall Smart Wallet or its suppliers be liable for any damages (including, without limitation,
          damages for loss of data or profit, or due to business interruption) arising out of the use or inability
          to use Smart Wallet, even if Smart Wallet or its authorized representative has been notified orally or
          in writing of the possibility of such damage.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-white">7. Governing Law</h2>
        <p className="text-slate-300 leading-relaxed">
          These terms and conditions are governed by and construed in accordance with the laws and you irrevocably
          submit to the exclusive jurisdiction of the courts in that state or location.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-white">8. Contact Information</h2>
        <p className="text-slate-300 leading-relaxed">
          If you have any questions about these Terms & Conditions, please contact us through our support channels.
        </p>
      </section>
    </LegalPageLayout>
  );
};

export default Terms;
