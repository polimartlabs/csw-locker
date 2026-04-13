export function formatAbi(type: any): string {
	if (typeof type === "string") return type
 
	// Handle wrapped types like optional, buffer, tuple, etc.
	if (typeof type === "object") {
		const [wrapper, inner] = Object.entries(type)[0]
 
		if (wrapper === "buffer" && typeof inner === "object" && "length" in inner) {
			return `buffer:${inner.length}`
		}
 
		if (wrapper === "tuple") {
			// e.g., { tuple: { a: "uint128", b: "bool" } }
			return (
			"tuple:" +
			Object.entries(inner)
				.map(([k, v]) => `${k}:${formatAbi(v)}`)
				.join(",")
			)
		}
 
	  // fallback (e.g. optional, response, list, etc.)
	  return `${wrapper}:${formatAbi(inner)}`
	}
 
	return ""
}