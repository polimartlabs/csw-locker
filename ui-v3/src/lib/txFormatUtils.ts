// src/lib/txFormatUtils.ts

export const formatAmount = (amount: string, decimals: number = 6) => {
  if (!amount) return '';
  const num = Number(amount) / Math.pow(10, decimals);
  if (isNaN(num)) return amount;
  return num.toLocaleString(undefined, { maximumFractionDigits: decimals });
};

export const formatAddressField = (value: string | undefined, lineLength = 48, maxLines = 3) => {
  if (!value) return '';
  const clean = value.replace(/^(\(list |\[|\]|'|\))/g, '').replace(/'/g, '').trim();
  const parts = clean.split(/\s+/);
  let lines: string[] = [];
  let current = '';
  for (const part of parts) {
    if ((current + ' ' + part).trim().length > lineLength) {
      lines.push(current.trim());
      current = part;
      if (lines.length === maxLines) break;
    } else {
      current += (current ? ' ' : '') + part;
    }
  }
  if (lines.length < maxLines && current) lines.push(current.trim());
  if (lines.length > maxLines) lines = lines.slice(0, maxLines);
  let result = lines.join('\n');
  if (parts.length > 0 && lines.length === maxLines && (parts.slice(lines.join(' ').split(/\s+/).length).length > 0 || clean.length > lineLength * maxLines)) {
    result += '\n...';
  }
  return result;
};
