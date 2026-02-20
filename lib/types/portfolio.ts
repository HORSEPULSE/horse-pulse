export type SupportedChain =
  | "ethereum"
  | "bsc"
  | "polygon"
  | "arbitrum"
  | "optimism"
  | "pulsechain";

export type PortfolioToken = {
  chain: SupportedChain;
  tokenAddress: string;
  symbol: string;
  name: string;
  balance: number;
  priceUsd: number;
  valueUsd: number;
  change24hPct: number | null;
  protocol: string | null;
  isLP: boolean;
  isStaked: boolean;
};

export type PortfolioActivity = {
  hash: string;
  chain: SupportedChain;
  timestamp: string;
  action: string;
  protocol: string | null;
  gasUsd: number | null;
  amountUsd: number | null;
};

export type NftHolding = {
  chain: SupportedChain;
  contract: string;
  tokenId: string;
  name: string;
  imageUrl: string | null;
  estimatedValueUsd: number | null;
};

export type PortfolioSnapshot = {
  address: string;
  fetchedAt: string;
  totalValueUsd: number;
  totalValueNative: number | null;
  chainBreakdown: Array<{
    chain: SupportedChain;
    valueUsd: number;
    sharePct: number;
  }>;
  tokenBreakdown: PortfolioToken[];
  lpPositions: PortfolioToken[];
  stakedPositions: PortfolioToken[];
  nftPositions: NftHolding[];
  recentActivity: PortfolioActivity[];
};

