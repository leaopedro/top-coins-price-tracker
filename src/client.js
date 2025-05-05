const RPC = require("@hyperswarm/rpc");
const DHT = require("hyperdht");
const config = require("./config");

const SERVER_PUBLIC_KEY_HEX = process.argv[2];

if (!SERVER_PUBLIC_KEY_HEX || SERVER_PUBLIC_KEY_HEX.length !== 64) {
    console.error("Usage: node src/client.js <server_public_key_hex>");
    process.exit(1);
}

const serverPubKey = Buffer.from(SERVER_PUBLIC_KEY_HEX, "hex");

async function main() {
    const dht = new DHT({ port: 50001, bootstrap: config.dht.bootstrap });
    await dht.ready();

    const rpc = new RPC({ dht });

    try {
        const latestPrices = await rpc.request(serverPubKey, "getLatestPrices", Buffer.from(JSON.stringify({ pairs: ["BTC", "ETH"] })));
        const latest = JSON.parse(latestPrices.toString());
        if (latest.success) {
            console.log("Latest Prices:\n", JSON.stringify(latest.data, null, 2));
        } else {
            console.error("Failed to get latest prices:", latest.error);
        }

        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1000;

        const historicalPrices = await rpc.request(serverPubKey, "getHistoricalPrices", Buffer.from(JSON.stringify({
            pairs: ["BTC"],
            from: oneHourAgo,
            to: now
        })));
        const historical = JSON.parse(historicalPrices.toString());
        if (historical.success) {
            console.log(`\nHistorical Prices (BTC):\n`, JSON.stringify(historical.data, null, 2));
        } else {
            console.error("Failed to get historical prices:", historical.error);
        }
    } catch (err) {
        console.error("RPC request error:", err);
    } finally {
        await rpc.destroy();
        await dht.destroy();
    }
}

main();
