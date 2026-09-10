export type TalabatCatalogSourceProduct = {
  remoteId: string;
  name: string;
  description?: string;
  categoryId: string;
  categoryName: string;
  price: number;
  active?: boolean;
  imageUrl?: string;
};

type CatalogItem = Record<string, unknown>;

function stableId(value: string, label: string): string {
  const id = value.trim();
  if (!id || id.length > 200 || !/^[A-Za-z0-9_.|:#-]+$/.test(id))
    throw new Error(`${label} must be a stable ID containing only letters, numbers, _, ., |, :, #, or -.`);
  return id;
}

export function compileTalabatCatalog(input: {
  posVendorId: string;
  callbackUrl: string;
  menuId?: string;
  menuName?: string;
  products: TalabatCatalogSourceProduct[];
}) {
  if (!input.posVendorId.trim()) throw new Error("POS vendor ID is required.");
  const callback = new URL(input.callbackUrl);
  if (callback.protocol !== "https:") throw new Error("Talabat catalog callback URL must use HTTPS.");
  if (!input.products.length) throw new Error("A Talabat catalog requires at least one product.");

  const items: Record<string, CatalogItem> = {};
  const menuId = stableId(input.menuId ?? "PRIZESKOUT_DELIVERY_MENU", "Menu ID");
  const menuProducts: Record<string, CatalogItem> = {};
  const categories = new Map<string, { name: string; products: Record<string, CatalogItem> }>();

  input.products.forEach((source, index) => {
    const productId = stableId(source.remoteId, "Product remote ID");
    const categoryId = stableId(source.categoryId, "Category ID");
    if (items[productId]) throw new Error(`Duplicate Talabat product ID: ${productId}.`);
    if (!source.name.trim()) throw new Error(`Product ${productId} requires a name.`);
    if (!Number.isFinite(source.price) || source.price < 0) throw new Error(`Product ${productId} requires a non-negative price.`);
    if (source.imageUrl && new URL(source.imageUrl).protocol !== "https:") throw new Error(`Product ${productId} image URL must use HTTPS.`);

    const imageId = source.imageUrl ? stableId(`IMAGE_${productId}`, "Image ID") : null;
    items[productId] = {
      id: productId, type: "Product", title: { default: source.name.trim() },
      ...(source.description?.trim() ? { description: { default: source.description.trim() } } : {}),
      active: source.active !== false, isPrepackedItem: false, isExpressItem: false,
      excludeDishInformation: true, price: source.price.toFixed(2),
      ...(imageId ? { images: { [imageId]: { id: imageId, type: "Image" } } } : {}),
    };
    if (imageId && source.imageUrl) items[imageId] = { id: imageId, type: "Image", url: source.imageUrl, alt: { default: source.name.trim() } };
    menuProducts[productId] = { id: productId, order: index + 1, type: "Product" };
    const category = categories.get(categoryId) ?? { name: source.categoryName.trim() || categoryId, products: {} };
    category.products[productId] = { id: productId, type: "Product" };
    categories.set(categoryId, category);
  });

  for (const [categoryId, category] of categories)
    items[categoryId] = { id: categoryId, type: "Category", title: { default: category.name }, products: category.products };
  items[menuId] = { id: menuId, type: "Menu", menuType: "DELIVERY", title: { default: input.menuName?.trim() || "Delivery menu" }, products: menuProducts };

  return { callbackUrl: callback.toString(), catalog: { items }, vendors: [input.posVendorId.trim()] };
}
