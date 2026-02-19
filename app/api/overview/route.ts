import { NextResponse } from "next/server";
import { fetchOverviewSnapshot } from "@/lib/api";

export async function GET() {
  try {
    const snapshot = await fetchOverviewSnapshot();
    return NextResponse.json(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown overview error";
    return NextResponse.json(
      {
        plsPriceUsd: null,
        marketCapUsd: null,
        supplyText: "N/A",
        gasPriceGwei: null,
        change24h: null,
        latestBlock: null,
        error: message,
      },
      { status: 200 },
    );
  }
}
