export const sponsorEnv = {
  useSponsorTech: process.env.NEXT_PUBLIC_USE_REAL_SPONSOR_TECH === "true",
  useAws: process.env.USE_REAL_AWS === "true",
  useExa: process.env.USE_REAL_EXA === "true",
  useVercelAi: process.env.USE_REAL_VERCEL_AI === "true",
  useBedrock: process.env.USE_REAL_BEDROCK === "true",
  aiGatewayModel: process.env.AI_GATEWAY_MODEL || "openai/gpt-5.4",
  aiGatewayFallbackModel: process.env.AI_GATEWAY_FALLBACK_MODEL || "anthropic/claude-sonnet-4.6",
  aiGatewayResearchModel: process.env.AI_GATEWAY_RESEARCH_MODEL || "anthropic/claude-sonnet-4.6",
  vercelOidcToken: process.env.VERCEL_OIDC_TOKEN,
  exaApiKey: process.env.EXA_API_KEY,
  awsRegion: process.env.AWS_REGION || "us-west-2",
  awsTextractRegion: process.env.AWS_TEXTRACT_REGION || process.env.AWS_REGION || "us-west-2",
  awsBucket: process.env.AWS_S3_BUCKET,
  bedrockRegion: process.env.AWS_BEDROCK_REGION || process.env.AWS_REGION || "us-west-2",
  bedrockModelId: process.env.AWS_BEDROCK_MODEL_ID,
  awsAgentEndpoint: process.env.AWS_AGENT_ENDPOINT,
};

export function isAwsReady() {
  return Boolean(
    sponsorEnv.useAws &&
      sponsorEnv.awsBucket &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY,
  );
}

export function isVercelAiReady() {
  return Boolean(
    sponsorEnv.useVercelAi &&
      (process.env.AI_GATEWAY_API_KEY || sponsorEnv.vercelOidcToken || process.env.VERCEL === "1"),
  );
}

export function isExaReady() {
  return Boolean(sponsorEnv.useExa && sponsorEnv.exaApiKey);
}

export function isBedrockReady() {
  return Boolean(
    sponsorEnv.useBedrock &&
      sponsorEnv.bedrockModelId &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY,
  );
}
