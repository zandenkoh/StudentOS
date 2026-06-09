import "server-only";

import { gateway, type GatewayModelId } from "@ai-sdk/gateway";

export function gatewayLanguageModel(modelId: string) {
  return gateway(modelId as GatewayModelId);
}
