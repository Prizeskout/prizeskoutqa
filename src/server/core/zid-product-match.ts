type Obj = Record<string, unknown>;

export function normalizeProductText(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u0640\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLocaleLowerCase("und")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function productNameValues(productOrName: unknown) {
  const value = productOrName && typeof productOrName === "object" && "name" in productOrName
    ? (productOrName as Obj).name
    : productOrName;
  if (value && typeof value === "object") {
    const localized = value as Obj;
    return [...new Set([localized.en, localized.ar, localized.name, localized.value]
      .map(item => String(item ?? "").trim())
      .filter(Boolean))];
  }
  const text = String(value ?? "").trim();
  return text ? [text] : [];
}

export function displayProductName(productOrName: unknown) {
  return productNameValues(productOrName)[0] ?? "";
}

export function productMatches(product: Obj, queryValue: string, exact = true) {
  const query = normalizeProductText(queryValue);
  if (!query) return false;
  const values = [...productNameValues(product), String(product.sku ?? "")].map(normalizeProductText);
  return exact ? values.some(value => value === query) : values.some(value => value.includes(query));
}
