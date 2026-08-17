export const ZID_SUBSCRIBED_EVENTS = [
  "product.create", "product.update", "product.publish", "product.delete",
  "order.create", "order.status.update", "order.payment_status.update",
] as const;

export async function registerZidWebhooks(params: {
  bearerToken: string; managerToken: string; webhookUrl: string; webhookSecret: string;
}): Promise<{ ok: true; registered: number } | { ok: false; registered: number; message: string }> {
  let registered = 0;
  for (const event of ZID_SUBSCRIBED_EVENTS) {
    let response: Response;
    try {
      response = await fetch("https://api.zid.sa/v1/managers/webhooks", {
        method: "POST",
        headers: {
          Authorization: params.bearerToken.startsWith("Bearer ") ? params.bearerToken : `Bearer ${params.bearerToken}`,
          "X-Manager-Token": params.managerToken,
          "Accept-Language": "en",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          event, target_url: params.webhookUrl, original_id: "prizeskout",
          conditions: {}, username: "prizeskout", password: params.webhookSecret,
        }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      return { ok: false, registered, message: error instanceof Error ? error.message : String(error) };
    }
    const body = await response.json().catch(() => null) as { data?: { active?: boolean }; message?: unknown } | null;
    if (!response.ok || body?.data?.active === false) {
      return { ok: false, registered, message: `Zid rejected ${event} webhook registration with HTTP ${response.status}.` };
    }
    registered += 1;
  }
  return { ok: true, registered };
}
