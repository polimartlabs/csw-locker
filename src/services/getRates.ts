import axios from "axios";
import { CharismaTokenData, CharismaApiResponse } from "./types";

export async function getRates(contractId?: string): Promise<CharismaTokenData | null> {
	try {
		if (contractId) {
			// Get specific token rate
			const response = await axios.get<CharismaApiResponse>(`https://invest.charisma.rocks/api/v1/prices/${contractId}`);
			const responseData = response.data;
			
			if (responseData.status === "success" && responseData.data) {
				return responseData.data;
			}
			
			return null;
		} else {
			// For now, return null when no contractId is provided
			// You can extend this to fetch multiple tokens if needed
			return null;
		}
	} catch (error) {
		return null;
	}
}
