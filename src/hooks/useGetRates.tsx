import { getRates } from "@/services/getRates";
import { CharismaTokenData } from "@/services/types";
import { useEffect, useState } from "react";
import { toast } from "./use-toast";

export default function useGetRates(contractId?: string) {
	const [rates, setRates] = useState<CharismaTokenData | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!contractId) {
			// Reset state when no contractId is provided
			setRates(null);
			setError(null);
			setLoading(false);
			return;
		}

		async function fetchData() {
			setLoading(true);
			setError(null);

			try {
				const res = await getRates(contractId);
				if (res) {
					setRates(res);
				} else {
					setError("No rate data available for this token");
					setRates(null);
				}
			} catch (err) {
				const errorMessage = err instanceof Error ? err.message : 'Failed to fetch rates';
				setError(errorMessage);
				setRates(null);
				
				// Show toast notification for errors
				toast({
					title: "Rate Fetch Error",
					description: errorMessage,
					variant: "destructive"
				});
			} finally {
				setLoading(false);
			}
		}
		
		fetchData();
	}, [contractId]);

	return { 
		rates, 
		loading, 
		error,
		// Convenience getters
		usdPrice: rates?.usdPrice || 0,
		marketPrice: rates?.marketPrice || 0,
		symbol: rates?.symbol || "",
		name: rates?.name || "",
		confidence: rates?.confidence || 0,
		lastUpdated: rates?.lastUpdated || 0
	};
}