import {
  SNOONU_CONNECTOR_MANIFEST,
  type SnoonuCapabilityState,
} from "@/lib/snoonu-connector-capabilities";
import {
  normalizeSnoonuPilotEvent,
  parseSnoonuPilotEnvelope,
} from "@/server/core/snoonu-pilot-contract";
import { handleSnoonuPilotWebhook } from "@/server/core/snoonu-pilot-webhook";

export type SnoonuConnectorManifest = typeof SNOONU_CONNECTOR_MANIFEST;

export interface SnoonuConnector {
  readonly manifest: SnoonuConnectorManifest;
  capability(name: keyof SnoonuConnectorManifest["capabilities"]): SnoonuCapabilityState;
  receivePartnerEvent(request: Request): Promise<Response>;
  normalizeFixture(input: unknown): ReturnType<typeof normalizeSnoonuPilotEvent>;
}

/**
 * Stable Snoonu adapter boundary.
 *
 * The existing signed webhook remains the transport implementation. Outbound
 * Snoonu API methods are intentionally absent until Snoonu supplies and
 * authorizes its partner contract.
 */
export const snoonuConnector: SnoonuConnector = {
  manifest: SNOONU_CONNECTOR_MANIFEST,
  capability(name) {
    return SNOONU_CONNECTOR_MANIFEST.capabilities[name];
  },
  receivePartnerEvent(request) {
    return handleSnoonuPilotWebhook(request);
  },
  normalizeFixture(input) {
    return normalizeSnoonuPilotEvent(parseSnoonuPilotEnvelope(input));
  },
};
