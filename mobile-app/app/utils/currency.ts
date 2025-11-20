export const sanitizeCurrencyInput = (value: string): string => {
  if (!value) {
    return "";
  }

  const digitsOnly = value.replace(/[^0-9.]/g, "");
  if (!digitsOnly) {
    return "";
  }

  const [whole, ...decimals] = digitsOnly.split(".");
  if (decimals.length === 0) {
    return whole;
  }

  const decimalPart = decimals.join("").slice(0, 2);
  const normalizedWhole = whole || "0";

  return `${normalizedWhole}.${decimalPart}`;
};

type NumberLike = string | number | null | undefined;

export const normalizeCurrencyValue = (value: NumberLike): string => {
  if (value === null || value === undefined) {
    return "0";
  }

  const strValue = typeof value === "number" ? value.toString() : value;
  const trimmed = (strValue ?? "").trim();
  if (!trimmed) {
    return "0";
  }

  const sanitized = sanitizeCurrencyInput(trimmed);
  if (!sanitized) {
    return "0";
  }

  return sanitized.endsWith(".") ? sanitized.slice(0, -1) || "0" : sanitized;
};
