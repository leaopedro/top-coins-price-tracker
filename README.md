# P2P Top Coins Price Tracker

Runs a task that fetches crypto price data from CoinGecko API, stores it using Hyperbee, and exposes it via RPC server.

## Features:
- Fetch top 5 coins by market cap
- Calculate average price from top 3 exchanges
- Store structured data using Hyperbee
- Expose RPC methods:
  - getLatestPrices(pairs: string[])
  - getHistoricalPrices(pairs: string[], from: number, to: number)
- Supports scheduled (every 30s or custom) and single execution
- Included a simple RPC client sample


## Getting Started

### Install deps

```bash
npm i
```

## Env Vars

Create a `.env` file if you want to use a CoinGecko API key (optional but recommended to avoid rate limiting):

```bash
cp .env.example .env
```
Set you API key:
```
COINGECKO_API_KEY=your_key_here
```

## Running server

### CLI usage

```bash
# Default interval (30s)
npm run server

# Single run
npm run once

# Custom interval (example: 10s)
node src/server.js --interval 10000
```

## Running the Client

After server started, copy the printed RPC public key and run in another peer or terminal:

```bash
node src/client.js <server_public_key>
```

