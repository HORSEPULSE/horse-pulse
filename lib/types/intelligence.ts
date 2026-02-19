export type TrustLevel = "High" | "Moderate" | "Speculative" | "High Risk";

export type ContractRiskResult = {
  score: number;
  trustLevel: TrustLevel;
  flags: string[];
  ownerStatus: {
    ownerAddress: string | null;
    renounced: boolean;
    ownerOnlyFunctions: string[];
  };
  proxyStatus: {
    isProxy: boolean;
    implementationAddress: string | null;
    upgradeabilityRisk: "low" | "medium" | "high";
  };
  liquidityStatus: {
    totalLiquidityUsd: number | null;
    pairCount: number;
    concentrationRisk: "low" | "medium" | "high";
  };
  tokenomicsSummary: string;
  mechanics: {
    mintable: boolean;
    pausable: boolean;
    blacklist: boolean;
    feeModifiable: boolean;
    taxLogic: boolean;
    honeypotHeuristic: boolean;
  };
  explanation: string;
};

export type WalletBehaviorEvent = {
  hash: string;
  kind: "swap" | "transfer" | "contract_interaction";
  timestamp: string;
  valueUsdApprox: number;
  from: string;
  to: string;
};

export type TokenExposure = {
  tokenAddress: string;
  symbol: string;
  balance: number;
  usdValue: number;
  portfolioSharePct: number;
  liquidityDepthUsd: number | null;
  holderConcentration: "low" | "medium" | "high";
  riskRating: TrustLevel;
  burnedPct: number | null;
  ownerStatus: "renounced" | "owner_active" | "unknown";
};

export type LpPosition = {
  pairLabel: string;
  sharePct: number;
  estimatedUsdValue: number;
  impermanentLossEstimatePct: number;
  liquidityDepthUsd: number | null;
};

export type WalletProfileSnapshot = {
  wallet: string;
  overview: {
    totalPortfolioUsd: number;
    totalPortfolioPls: number;
    tokenCount: number;
    lpPositionCount: number;
    stakedPositionCount: number;
    nftCount: number;
    netInflowUsdApprox: number;
    netOutflowUsdApprox: number;
    change7dPctApprox: number;
    change30dPctApprox: number;
  };
  tokens: TokenExposure[];
  lpPositions: LpPosition[];
  stakedPositions: Array<{ protocol: string; amountUsd: number }>;
  nftPositions: Array<{ contract: string; tokenId: string; name: string }>;
  behaviorTimeline: WalletBehaviorEvent[];
};

export type WalletAiProfileResult = {
  riskScore: number;
  behaviorSummary: string;
  concentrationRisk: string;
  liquidityExposure: string;
  tradingPattern: string;
  redFlags: string[];
  whaleActivity: string[];
  opportunitySignals: string[];
};

export type EcosystemSnapshot = {
  topVolumeTokens: Array<{ symbol: string; address: string; volume24hUsd: number; priceUsd: number | null }>;
  liquidityGrowth: Array<{ symbol: string; address: string; liquidityUsd: number; growth24hPct: number }>;
  holderGrowth: Array<{ symbol: string; address: string; holdersApprox: number; growth7dPctApprox: number }>;
  newContracts: Array<{ address: string; deployedAt: string; label: string }>;
  whaleMovements: Array<{ wallet: string; token: string; amountUsd: number; direction: "in" | "out"; timestamp: string }>;
  burnLeaderboard: Array<{ symbol: string; burnedUsdApprox: number }>;
  riskHeatmap: Array<{ symbol: string; riskScore: number; trustLevel: TrustLevel }>;
};

