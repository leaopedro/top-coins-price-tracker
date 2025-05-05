module.exports = {
    coingecko: {
        apiKey: process.env.COINGECKO_API_KEY,
        apiBaseUrl: "https://api.coingecko.com/api/v3",
        vsCurrency: "usd",
        topNCoins: 5,
        topNExchanges: 3,
        requestDelayMs: 600, // Delay between API calls to avoid rate limits
    },
    pipeline: {
        intervalMs: 30000, // 30 seconds
    },
    hyperbee: {
        storageDir: "./db/crypto-data", // Directory for hyperbee data
        keyEncoding: "utf-8",
        valueEncoding: "json",
    },
    dht: {
        port: 40001, // Port for the DHT node
        bootstrap: [{ host: "127.0.0.1", port: 30001 }], // Default bootstrap node (run manually)
    },
    rpcServer: {
        // Seed will be generated/loaded from hyperbee
    },
};

