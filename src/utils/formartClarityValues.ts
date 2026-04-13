import { cvToValue, hexToCV } from "@stacks/transactions";

export const formatClarityValues = (hexValue: string) => {
    if (!hexValue) return '';
    
    try {
        const value = cvToValue(hexToCV(hexValue));
        console.log('value', { value });
        
        // Check if value is an object with name and namespace properties
        if (value && typeof value === 'object' && 'name' in value && 'namespace' in value) {
            const nameHex = value.name?.value;
            const namespaceHex = value.namespace?.value;
            
            if (nameHex && namespaceHex) {
                // Convert hex to string
                const nameStr = hexToString(nameHex);
                const namespaceStr = hexToString(namespaceHex);
                return `${nameStr}.${namespaceStr}`;
            }
        }
        
        // Check if value is a BigInt (e.g., {value: 21n})
        if (value && typeof value === 'object' && 'value' in value && typeof value.value === 'bigint') {
            return value.value.toString();
        }
        
        // Check if value is directly a BigInt
        if (typeof value === 'bigint') {
            return value.toString();
        }
        
        // Return the value as is for other cases
        return value;
    } catch (error) {
        console.error('Error formatting Clarity value:', error);
        return hexValue; // Return original hex if conversion fails
    }
}

// Helper function to convert hex string to readable string
const hexToString = (hex: string): string => {
    try {
        // Remove '0x' prefix if present
        const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
        
        // Convert hex to bytes then to string
        const bytes = [];
        for (let i = 0; i < cleanHex.length; i += 2) {
            bytes.push(parseInt(cleanHex.substr(i, 2), 16));
        }
        
        // Convert bytes to string, filtering out null bytes
        return bytes
            .filter(byte => byte !== 0)
            .map(byte => String.fromCharCode(byte))
            .join('');
    } catch (error) {
        console.error('Error converting hex to string:', error);
        return hex; // Return original hex if conversion fails
    }
}