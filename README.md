# HORSE PULSE

Production-ready PulseChain ecosystem analytics platform built with Next.js 14, React, Tailwind CSS, and TypeScript.

## Tech Stack

- Next.js 14 (App Router)
- React 18
- Tailwind CSS
- TypeScript
- Deployable to Vercel
- No standalone backend server (client/server components + API-ready `lib/api.ts`)

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` in project root:

```bash
NEXT_PUBLIC_RPC_URL=https://your-pulsechain-rpc-url
MORALIS_API_KEY=your_moralis_api_key
# Optional ClawFI/ClawAI enrichment for contract analyzer:
CLAWFI_API_KEY=your_clawfi_api_key
# Optional endpoint overrides:
# CLAWFI_BASE_URL=https://api.clawfi.ai
# CLAWFI_ANALYZE_PATH=/v1/analyze/token
```

## Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Production Build

```bash
npm run build
npm run start
```

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import it into Vercel.
3. Add these environment variables in Vercel Project Settings:
- `NEXT_PUBLIC_RPC_URL`
- `MORALIS_API_KEY`
4. Deploy.

## API Integration

All API endpoints are implemented in `lib/api.ts`:
- Dexscreener token pricing and pair discovery
- PulseChain RPC helpers for block and gas data
- Moralis wallet/token endpoints (`MORALIS_API_KEY` required)
- AI contract analyzer endpoint at `app/api/ai/analyze/route.ts` (heuristic + optional ClawFI enrichment)

## Branding Assets

Place these files in `/public`:
- `fire_horse_icon_512.png`
- `fire_horse_sick_header.png`

The app already references these paths in the navbar, footer, and homepage hero.
