export type LandingMarket = {
  code: "qa" | "sa" | "ae" | "kw" | "bh" | "om";
  currency: "QAR" | "SAR" | "AED" | "KWD" | "BHD" | "OMR";
  rate: number;
  digits: number;
};

export function landingMoney(market: LandingMarket, qar: number, digits = market.digits) {
  const value = qar * market.rate;
  const precision = Math.max(digits, market.digits);
  return `${market.currency} ${value.toLocaleString("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })}`;
}

export function localizeLandingMoney(text: string, market: LandingMarket) {
  const withCodes = text.replace(/QAR\s*([\d,]+(?:\.\d+)?)/g, (_, raw: string) => {
    const decimals = raw.includes(".") ? Math.max(market.digits, raw.split(".")[1].length) : market.digits;
    return landingMoney(market, Number(raw.replaceAll(",", "")), decimals);
  });
  return withCodes.replace(/([\d,]+(?:\.\d+)?)\s*ر\.ق/g, (_, raw: string) => {
    const decimals = raw.includes(".") ? Math.max(market.digits, raw.split(".")[1].length) : market.digits;
    return landingMoney(market, Number(raw.replaceAll(",", "")), decimals);
  });
}
