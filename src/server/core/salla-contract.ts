export const SALLA_API_BASE = "https://api.salla.dev/admin/v2";

export const SALLA_REQUIRED_SCOPES = [
  "offline_access",
  "settings.read",
  "orders.read",
  "products.read_write",
  "categories.read",
  "brands.read",
  "webhooks.read_write",
] as const;

export type SallaProduct = {
  id: string | number;
  sku?: string | null;
  name?: string;
  arabic_name?: string;
  price?: { amount?: number; currency?: string } | number;
  cost_price?: string | number | null;
  cost?: number | null;
  quantity?: string | number | null;
  unlimited_quantity?: boolean;
};

export type SallaProductPage = {
  data?: SallaProduct[];
  pagination?: {
    currentPage?: number;
    totalPages?: number;
  };
};

export function sallaScopeString(): string {
  return SALLA_REQUIRED_SCOPES.join(" ");
}

export function sallaHasNextPage(page: SallaProductPage, requestedPage: number): boolean {
  const current = Number(page.pagination?.currentPage ?? requestedPage);
  const total = Number(page.pagination?.totalPages ?? current);
  return Number.isFinite(current) && Number.isFinite(total) && current < total;
}

export function sallaPriceAmount(value: SallaProduct["price"]): number {
  const raw = value && typeof value === "object" ? value.amount : value;
  const amount = Number(raw ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function sallaPriceCurrency(value: SallaProduct["price"]): string {
  return value && typeof value === "object" && value.currency
    ? value.currency
    : "SAR";
}

export function sallaProductCost(product: SallaProduct): number | null {
  const raw = product.cost_price ?? product.cost;
  if (raw === null || raw === undefined || raw === "") return null;
  const amount = Number(raw);
  return Number.isFinite(amount) ? amount : null;
}

export function sallaProductQuantity(product: SallaProduct): number | null {
  if (product.quantity === null || product.quantity === undefined || product.quantity === "") return null;
  const quantity = Number(product.quantity);
  return Number.isFinite(quantity) ? quantity : null;
}

export function buildSallaPriceUpdate(newPrice: number): { price: number } {
  if (!Number.isFinite(newPrice) || newPrice <= 0) {
    throw new Error("Salla price must be greater than zero.");
  }
  return { price: newPrice };
}
