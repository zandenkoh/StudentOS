import "server-only";

import { createGateway, gateway, type GatewayModelId } from "@ai-sdk/gateway";

const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();
const preferOidc = process.env.AI_GATEWAY_AUTH_MODE === "oidc";
const oidcGateway = oidcToken
  ? createGateway({
      headers: {
        Authorization: `Bearer ${oidcToken}`,
        "ai-gateway-auth-method": "oidc",
      },
    })
  : undefined;

export function gatewayLanguageModel(modelId: string) {
  return (preferOidc && oidcGateway ? oidcGateway : gateway)(modelId as GatewayModelId);
}
