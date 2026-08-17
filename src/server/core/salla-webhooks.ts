import { SALLA_API_BASE } from "./salla-contract";

export const SALLA_SUBSCRIBED_EVENTS = [
  "product.created", "product.deleted", "product.price.updated", "product.status.updated",
  "product.image.updated", "product.category.updated", "product.brand.updated", "product.tags.updated",
  "product.quantity.low",
  "order.created", "order.updated", "order.status.updated", "order.payment.updated",
  "order.total.price.updated", "order.products.updated", "order.cancelled", "order.refunded",
  "order.deleted", "order.shipping.address.updated", "order.coupon.updated",
  "invoice.created",
  "shipment.creating", "shipment.created", "shipment.updated", "shipment.cancelled",
  "order.shipment.creating", "order.shipment.created", "order.shipment.cancelled",
  "order.shipment.return.creating", "order.shipment.return.created", "order.shipment.return.cancelled",
  "category.created", "category.updated", "category.deleted",
  "brand.created", "brand.updated", "brand.deleted",
] as const;

export async function registerSallaWebhooks(
  accessToken: string,
  webhookUrl: string,
): Promise<{ ok: true; registered: number } | { ok: false; registered: number; message: string }> {
  let registered = 0;
  for (const event of SALLA_SUBSCRIBED_EVENTS) {
    let response: Response;
    try {
      response = await fetch(`${SALLA_API_BASE}/webhooks/subscribe`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `PrizeSkout ${event}`,
          event,
          url: webhookUrl,
          version: 2,
        }),
      });
    } catch (error) {
      return { ok: false, registered, message: error instanceof Error ? error.message : String(error) };
    }
    const payload = await response.json().catch(() => null) as { success?: boolean; message?: string } | null;
    if (!response.ok || payload?.success === false) {
      return {
        ok: false,
        registered,
        message: payload?.message ?? `Salla rejected ${event} webhook registration with HTTP ${response.status}.`,
      };
    }
    registered += 1;
  }
  return { ok: true, registered };
}
