export type FeatureFlag =
  | "ai_contract_intel"
  | "ai_wallet_intel"
  | "ecosystem_dashboard"
  | "horse_token_gating"
  | "advanced_risk_v2";

const defaults: Record<FeatureFlag, boolean> = {
  ai_contract_intel: true,
  ai_wallet_intel: true,
  ecosystem_dashboard: true,
  horse_token_gating: true,
  advanced_risk_v2: true,
};

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  const envKey = `FEATURE_${flag.toUpperCase()}`;
  const envValue = process.env[envKey];
  if (envValue === undefined) return defaults[flag];
  return envValue === "1" || envValue.toLowerCase() === "true";
}

