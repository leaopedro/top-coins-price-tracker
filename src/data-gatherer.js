const axios = require("axios");
const config = require("./config");

const createApiClient = () => {
    const params = {};
    if (config.coingecko.apiKey) {
        params.x_cg_demo_api_key = config.coingecko.apiKey;
        console.log("Using CoinGecko API key.");
    } else {
        console.log("No CoinGecko API key found. Using public access.");
    }

    return axios.create({
        baseURL: config.coingecko.apiBaseUrl,
        params
    });
};

const apiClient = createApiClient();

async function fetchTopCoins() {
    try {
        const response = await apiClient.get("/coins/markets", {
            params: {
                vs_currency: config.coingecko.vsCurrency,
                order: "market_cap_desc",
                per_page: config.coingecko.topNCoins,
                page: 1,
                sparkline: false
            }
        });

        return response.data.map(coin => ({
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name
        }));
    } catch (err) {
        const msg = err.response ? `${err.response.status} ${err.response.statusText}` : err.message;
        console.error("Failed to fetch top coins:", msg);
        if (err.response?.status === 429) console.warn("Rate limit hit.");
        return [];
    }
}

async function fetchCoinTickers(coinId) {
    try {
        const response = await apiClient.get(`/coins/${coinId}/tickers`, {
            params: {
                include_exchange_logo: false,
                page: 1,
                order: "volume_desc",
                depth: false
            }
        });

        return response.data.tickers;
    } catch (err) {
        const msg = err.response ? `${err.response.status} ${err.response.statusText}` : err.message;
        console.error(`Failed to fetch tickers for ${coinId}:`, msg);
        if (err.response?.status === 429) console.warn(`Rate limit hit for ${coinId}`);
        return [];
    }
}

async function processCoinData(coinId, symbol, name) {
    const tickers = await fetchCoinTickers(coinId);
    if (!tickers.length) return null;

    const filtered = tickers.filter(t =>
        t.target?.toLowerCase() === config.coingecko.vsCurrency.toLowerCase() &&
        typeof t.last === "number" &&
        t.trust_score === "green"
    );

    const topTickers = filtered.slice(0, config.coingecko.topNExchanges);
    const timestamp = new Date().toISOString();
    const upperSymbol = symbol.toUpperCase();

    if (!topTickers.length) {
        const fallback = tickers.find(t =>
            t.target?.toLowerCase() === config.coingecko.vsCurrency.toLowerCase() &&
            typeof t.last === "number"
        );
        if (!fallback) return null;

        return {
            timestamp,
            id: coinId,
            symbol: upperSymbol,
            name,
            averagePriceUsdt: fallback.last,
            sourceExchanges: [{
                name: fallback.market.name,
                price: fallback.last,
                volume: fallback.converted_volume.usd
            }]
        };
    }

    const average = topTickers.reduce((sum, t) => sum + t.last, 0) / topTickers.length;

    return {
        timestamp,
        id: coinId,
        symbol: upperSymbol,
        name,
        averagePriceUsdt: average,
        sourceExchanges: topTickers.map(t => ({
            name: t.market.name,
            price: t.last,
            volume: t.converted_volume.usd
        }))
    };
}

async function gatherData() {
    console.log("Gathering crypto price data...");
    const coins = await fetchTopCoins();
    if (!coins.length) return [];

    const results = [];
    for (const coin of coins) {
        const data = await processCoinData(coin.id, coin.symbol, coin.name);
        console.log(`Processed ${coin.name} (${coin.symbol}): Avg price: $${data.averagePriceUsdt.toFixed(2)} USD`);
        if (data) results.push(data);
    }

    console.log(`Gathered data for ${results.length} coins.`);
    return results;
}

module.exports = {
    gatherData
};
