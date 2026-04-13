import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

// Extracted FAQ data as a JSON-like array
const faqData = [
	{
		question: "What is Smart Wallet?",
		answer:
			"Smart Wallet is a next-generation blockchain wallet solution that uses smart contracts to provide enhanced security, flexibility, and functionality. Unlike traditional wallets, Smart Wallet allows for key rotation, recovery mechanisms, and advanced asset management features.",
	},
	{
		question: "What can I do with my Smart Wallet account?",
		answer:
			"With Smart Wallet, you can send and receive STX tokens, participate in stacking to earn Bitcoin rewards, manage multiple assets, set up recovery mechanisms, rotate keys for enhanced security, and interact with smart contracts on the Stacks blockchain.",
	},
	{
		question: "What are the system requirements for running Smart Wallet?",
		answer:
			"Smart Wallet runs in modern web browsers and requires an internet connection. We recommend using the latest versions of Chrome, Firefox, Safari, or Edge. No additional software installation is required as it's a web-based application.",
	},
	{
		question: "How secure is Smart Wallet?",
		answer:
			"Smart Wallet implements industry-leading security practices including smart contract-based architecture, key rotation capabilities, multi-signature support, and recovery mechanisms. Your private keys remain under your control, and the smart contract provides additional layers of protection.",
	},
	{
		question: "Can I stake STX tokens with Smart Wallet?",
		answer:
			"Yes! Smart Wallet supports STX stacking, allowing you to earn Bitcoin rewards by locking your STX tokens for specified cycles. You can stack solo if you have the minimum required amount or participate in stacking pools for smaller amounts.",
	},
	{
		question: "What happens if I lose access to my wallet?",
		answer:
			"Smart Wallet includes recovery mechanisms that you can set up during wallet creation. These may include recovery contacts, time-locked recovery options, or multi-signature recovery processes. Always ensure you have your recovery phrase stored securely as a backup.",
	},
];

const FAQSection = () => {
	return (
		<section className="py-20 bg-slate-900/50">
			<div className="container mx-auto px-4">
				<div className="text-center space-y-4 mb-16">
					<div className="flex items-center justify-center space-x-3">
						<HelpCircle className="h-8 w-8 text-purple-400" />
						<h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
							Frequently Asked Questions
						</h2>
					</div>
					<p className="text-slate-400 max-w-2xl mx-auto">
						Get answers to common questions about Smart Wallet functionality and
						features.
					</p>
				</div>

				<div className="max-w-4xl mx-auto">
					<Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
						<CardContent className="p-8">
							<Accordion type="single" collapsible className="space-y-4">
								{faqData.map((item, idx) => (
									<AccordionItem
										key={idx}
										value={`item-${idx + 1}`}
										className="border-slate-700"
									>
										<AccordionTrigger className="text-white hover:text-purple-300 text-left">
											{item.question}
										</AccordionTrigger>
										<AccordionContent className="text-slate-300">
											{item.answer}
										</AccordionContent>
									</AccordionItem>
								))}
							</Accordion>
						</CardContent>
					</Card>
				</div>
			</div>
		</section>
	);
};

export default FAQSection;
