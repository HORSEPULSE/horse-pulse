# HORSE PULSE

PulseChain Intelligence Terminal built on Next.js 14, TypeScript, Tailwind, and Vercel.

## What Is Implemented

- Homepage live market terminal with USD/WPLS mode and featured token cards
- Dynamic token intelligence pages: `/coins/[address]`
- Wallet lookup + profile intelligence:
  - `/wallet`
  - `/profile/[address]`
- Ecosystem intelligence dashboard: `/ecosystem`
- AI contract analyzer (risk engine + optional ClawFI enrich): `/api/ai/analyze`
- AI wallet profile analyzer: `/api/ai/profile-analyze`
- Portfolio snapshot API: `/api/profile/[address]`
- Ecosystem API: `/api/ecosystem`
- Token utility access API (signature + HORSE balance gate): `/api/utility/access`

## Architecture

- App Router (Next.js 14)
- API-first service modules in `lib/services/*`
- Input validation with `zod` (`lib/schemas/api.ts`)
- API rate limiting (`lib/security/rate-limit.ts`)
- Multi-layer cache abstraction (`lib/cache/store.ts`)
  - Local in-memory cache
  - Optional Vercel KV REST cache
- Type-safe domain models (`lib/types/intelligence.ts`)
- Feature flag utility (`lib/feature-flags.ts`)
- Database schema design in `prisma/schema.prisma`

## Key Routes

- `/` Home terminal
- `/coins` Coin explorer
- `/coins/[address]` Coin intelligence page
- `/wallet` Wallet lookup
- `/profile/[address]` DeBank-style wallet profile
- `/ecosystem` Ecosystem intelligence dashboard

## API Routes

- `GET /api/overview`
- `GET /api/featured-prices?frame=5m|1h|6h|24h`
- `GET /api/coin/[address]`
- `GET /api/wallet/[address]`
- `GET /api/profile/[address]`
- `GET /api/ecosystem`
- `GET /api/explorer?q=...`
- `POST /api/ai/analyze`
- `POST /api/ai/profile-analyze`
- `POST /api/utility/access`

## Environment Variables

Create `.env.local`:

```bash
# Public client-side RPC URL (read-only)
NEXT_PUBLIC_RPC_URL=https://rpc.pulsechain.com

# Server-side keys
MORALIS_API_KEY=your_moralis_key
CLAWFI_API_KEY=your_clawfi_key

# Optional ClawFI override
CLAWFI_BASE_URL=https://api.clawfi.ai
CLAWFI_ANALYZE_PATH=/v1/analyze/token

# Optional Vercel KV REST cache (recommended for scale)
KV_REST_API_URL=your_vercel_kv_rest_url
KV_REST_API_TOKEN=your_vercel_kv_rest_token

# Optional feature flags
FEATURE_AI_PROFILE=true
FEATURE_ECOSYSTEM=true
FEATURE_TOKEN_GATE=true
```

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run start
```

## Deploy to Vercel

1. Push repository to GitHub.
2. Import repo in Vercel.
3. Set environment variables from section above.
4. Deploy.
5. Validate:
   - `/api/featured-prices?frame=24h`
   - `/api/profile/<walletAddress>`
   - `/api/ecosystem`

## Security Notes

- No private key or seed phrase handling
- No custodial wallet storage
- Signature verification uses recovered address matching
- API keys are server-side only
- Zod-validated request payloads
- Rate limiting enabled on AI and profile endpoints

## Scaling Notes

- Price cache target: 30s
- Wallet cache target: 60s
- LP recalculation target: 5m
- Keep RPC over-querying low by routing through cache/service layer

