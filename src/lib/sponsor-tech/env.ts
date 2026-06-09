export const sponsorEnv = {
  useSponsorTech: process.env.NEXT_PUBLIC_USE_REAL_SPONSOR_TECH === "true",
  useAws: process.env.USE_REAL_AWS === "true",
  useExa: process.env.USE_REAL_EXA === "true",
  useVercelAi: process.env.USE_REAL_VERCEL_AI === "true",
  useBedrock: process.env.USE_REAL_BEDROCK === "true",
  awsRegion: process.env.AWS_REGION || "us-west-2",
  awsTextractRegion: process.env.AWS_TEXTRACT_REGION || process.env.AWS_REGION || "us-west-2",
  awsBucket: process.env.AWS_S3_BUCKET,
  bedrockRegion: process.env.AWS_BEDROCK_REGION || process.env.AWS_REGION || "us-west-2",
  bedrockModelId: process.env.AWS_BEDROCK_MODEL_ID,
};

export function isAwsReady() {
  return Boolean(
    sponsorEnv.useAws &&
      sponsorEnv.awsBucket &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY,
  );
}
