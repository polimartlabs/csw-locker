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
