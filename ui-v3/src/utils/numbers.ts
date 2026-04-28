export function formatDecimals(
	value: number | string,
	decimals: number,
	isUmicro: boolean
) {
	if (isUmicro) {
		return (Number(value) * 10 ** decimals).toFixed(0);
	} else {
		return (Number(value) / 10 ** decimals).toFixed(4);
	}
};

export function formatNumber(number: number, decimals: number) {
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: decimals,
		minimumFractionDigits: decimals,
		style: "decimal"
	}).format(number)
}

/** Display BTC from satoshis with fewer than 8 fraction digits. */
export function formatBtcFromSats(sats: number) {
	const btc = sats / 1e8;
	return new Intl.NumberFormat("en-US", {
		maximumFractionDigits: 5,
		minimumFractionDigits: 0,
	}).format(btc);
}
