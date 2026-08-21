const moneyFormatter = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function parsePastedCurrency(value: string) {
  const cleaned = value.trim().replace(/[^0-9,.-]/g, "");
  if (!cleaned) return 0;
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  const decimalIndex = Math.max(lastComma, lastDot);
  if (decimalIndex === -1) return Number(cleaned.replace(/\D/g, "")) || 0;
  const decimalPart = cleaned.slice(decimalIndex + 1).replace(/\D/g, "");
  const separatorCount = (cleaned.match(/[,.]/g) || []).length;
  if (decimalPart.length === 3 && (separatorCount > 1 || /^[0-9]+[,.][0-9]{3}$/.test(cleaned))) {
    return Number(cleaned.replace(/[,.]/g, "")) || 0;
  }
  const integerPart = cleaned.slice(0, decimalIndex).replace(/\D/g, "") || "0";
  const parsed = Number(`${integerPart}.${decimalPart || "0"}`);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatPastedCurrency(value: string) {
  const parsed = parsePastedCurrency(value);
  return value.trim() ? moneyFormatter.format(parsed) : "";
}
