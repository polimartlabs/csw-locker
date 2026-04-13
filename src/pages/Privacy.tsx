import LegalPageLayout from "@/components/LegalPageLayout";

const Privacy = () => {
    return (
        <LegalPageLayout
            title="Privacy Policy"
            lastUpdated="September 30, 2025"
        >
            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">1. Our Privacy Commitment</h2>
                <p className="text-slate-300 leading-relaxed">
                    Smart Wallet is designed with privacy as a core principle. We believe in your right to financial privacy
                    and have built our application to minimize data collection and maximize your control over your information.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">2. Data We Don't Store</h2>
                <p className="text-slate-300 leading-relaxed">
                    Smart Wallet operates on a privacy-first architecture. We do not store, collect, or have access to:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                    <li>Your private keys or seed phrases</li>
                    <li>Your wallet addresses or transaction history</li>
                    <li>Personal identification information</li>
                    <li>Financial data or account balances</li>
                    <li>Location data or device identifiers</li>
                    <li>Browsing patterns or usage analytics</li>
                </ul>
                <p className="text-slate-300 leading-relaxed mt-4">
                    All sensitive wallet operations are performed locally on your device and never transmitted to our servers.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">3. Cookies and Tracking</h2>
                <p className="text-slate-300 leading-relaxed">
                    Smart Wallet does not use cookies for tracking, marketing, or analytics purposes. We do not:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                    <li>Use third-party tracking scripts or analytics tools</li>
                    <li>Collect behavioral data or create user profiles</li>
                    <li>Share data with advertising networks or marketing platforms</li>
                    <li>Use persistent identifiers to track users across sessions</li>
                </ul>
                <p className="text-slate-300 leading-relaxed mt-4">
                    Any technical cookies used are strictly necessary for the application's functionality and are stored
                    locally on your device without transmitting personal information.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">4. Self-Hosting</h2>
                <p className="text-slate-300 leading-relaxed">
                    For maximum privacy and control, you can host Smart Wallet yourself. The application is open-source
                    and designed to run entirely on your own infrastructure:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                    <li>Host the UI on your own server or local machine</li>
                    <li>Maintain complete control over your data and privacy</li>
                    <li>Customize the application to meet your specific needs</li>
                    <li>Eliminate any dependency on third-party services</li>
                </ul>
                <p className="text-slate-300 leading-relaxed mt-4">
                    Self-hosting ensures that your wallet interactions never leave your controlled environment.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">5. Third-Party Services</h2>
                <p className="text-slate-300 leading-relaxed">
                    Smart Wallet may interact with blockchain networks and other decentralized services to function properly.
                    These interactions are necessary for wallet functionality but do not involve sharing your private data:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                    <li>Blockchain queries are made anonymously</li>
                    <li>No personal information is transmitted to network nodes</li>
                    <li>Transaction broadcasts are standard blockchain operations</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">6. Data Security</h2>
                <p className="text-slate-300 leading-relaxed">
                    Since we don't store your private data, we can't lose it or have it compromised. Your wallet security
                    depends entirely on your own practices:
                </p>
                <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
                    <li>Keep your seed phrases and private keys secure</li>
                    <li>Use strong passwords for wallet encryption</li>
                    <li>Regularly backup your wallet recovery information</li>
                    <li>Be cautious when using public or shared computers</li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">7. Updates to This Policy</h2>
                <p className="text-slate-300 leading-relaxed">
                    We may update this Privacy Policy from time to time to reflect changes in our practices or for legal
                    reasons. Any changes will be posted on this page with an updated revision date. Continued use of
                    Smart Wallet after changes are posted constitutes acceptance of the updated policy.
                </p>
            </section>

            <section className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">8. Contact Us</h2>
                <p className="text-slate-300 leading-relaxed">
                    If you have any questions about this Privacy Policy or our privacy practices, please contact us
                    through our support channels. We're committed to addressing any privacy concerns you may have.
                </p>
            </section>
        </LegalPageLayout>
    );
};

export default Privacy;