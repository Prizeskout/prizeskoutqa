export type Category = "All" | "Electronics" | "Grocery" | "Fashion" | "Home" | "Beauty";
export type ChannelOpt = "All Channels" | "Online" | "In-Store";
export type SortKey = "Price gap" | "Your price" | "Category" | "Signal";

export type CompetitorPrice = number | null | { price: number; outOfStock: true };

export type Product = {
  id: number;
  name: string;
  category: Exclude<Category, "All">;
  channel: "online" | "in-store";
  yourPrice: number;
  talabat: CompetitorPrice;
  carrefour: CompetitorPrice;
  lulu: CompetitorPrice;
  amazon: CompetitorPrice;
  noon: CompetitorPrice;
  signal: "RAISE" | "LOWER" | "HOLD" | "WATCH";
};

export const PRODUCTS: Product[] = [
  { id: 1, name: "Samsung Galaxy S24 Ultra 256GB", category: "Electronics", channel: "online", yourPrice: 3899, talabat: 3949, carrefour: 3799, lulu: 3849, amazon: 3699, noon: 3749, signal: "HOLD" },
  { id: 2, name: "Sony WH-1000XM5 Headphones", category: "Electronics", channel: "online", yourPrice: 1299, talabat: 1349, carrefour: 1199, lulu: 1249, amazon: 1149, noon: 1199, signal: "LOWER" },
  { id: 3, name: "Apple MacBook Air M3 256GB", category: "Electronics", channel: "online", yourPrice: 4499, talabat: 4599, carrefour: 4449, lulu: { price: 4399, outOfStock: true }, amazon: 4299, noon: 4349, signal: "RAISE" },
  { id: 4, name: "Nike Air Max 90 Men", category: "Fashion", channel: "online", yourPrice: 549, talabat: 579, carrefour: null, lulu: null, amazon: 499, noon: 519, signal: "HOLD" },
  { id: 5, name: "Dyson V15 Detect Vacuum", category: "Home", channel: "online", yourPrice: 2799, talabat: 2849, carrefour: 2699, lulu: 2749, amazon: 2599, noon: 2649, signal: "LOWER" },
  { id: 6, name: "Al Rawabi Fresh Milk 2L", category: "Grocery", channel: "online", yourPrice: 8.5, talabat: 8.75, carrefour: 7.95, lulu: 8.25, amazon: null, noon: null, signal: "HOLD" },
  { id: 7, name: "Ariel Detergent 3kg", category: "Grocery", channel: "online", yourPrice: 42, talabat: 44, carrefour: 38.5, lulu: 39.9, amazon: 41, noon: 40.5, signal: "LOWER" },
  { id: 8, name: "iPad Air M2 11-inch 128GB", category: "Electronics", channel: "online", yourPrice: 2699, talabat: 2749, carrefour: 2649, lulu: 2599, amazon: 2549, noon: 2599, signal: "LOWER" },
  { id: 9, name: "Samsung Galaxy S24 Ultra 256GB", category: "Electronics", channel: "in-store", yourPrice: 3999, talabat: null, carrefour: 3849, lulu: 3899, amazon: null, noon: null, signal: "WATCH" },
  { id: 10, name: "Dyson V15 Detect Vacuum", category: "Home", channel: "in-store", yourPrice: 2899, talabat: null, carrefour: 2749, lulu: 2799, amazon: null, noon: null, signal: "LOWER" },
  { id: 11, name: "The Ordinary Niacinamide Serum", category: "Beauty", channel: "online", yourPrice: 45, talabat: 42, carrefour: null, lulu: 39.9, amazon: 38, noon: 41, signal: "LOWER" },
  { id: 12, name: "Nespresso Vertuo Pop Machine", category: "Home", channel: "in-store", yourPrice: 479, talabat: null, carrefour: 449, lulu: 459, amazon: null, noon: null, signal: "LOWER" },
];

export function getPriceValue(p: CompetitorPrice): number | null {
  if (p === null) return null;
  if (typeof p === "number") return p;
  return p.price;
}

export function isOutOfStock(p: CompetitorPrice): boolean {
  return p !== null && typeof p !== "number" && p.outOfStock === true;
}

export function formatQAR(n: number): string {
  return `QAR ${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`;
}
