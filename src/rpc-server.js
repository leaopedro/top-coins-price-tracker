const RPC = require("@hyperswarm/rpc");
const DHT = require("hyperdht");
const crypto = require("crypto");
const storage = require("./storage");
const config = require("./config");

let rpc = null;
let rpcServer = null;
let dht = null;
let keyPair = null;

function ensureBuffer(value) {
    if (Buffer.isBuffer(value)) return value;
    if (value?.type === "Buffer" && Array.isArray(value.data)) return Buffer.from(value.data);
    throw new Error("Invalid buffer format retrieved from DB.");
}

async function startRPCServer() {
    if (rpcServer?.listening) return;

    const db = storage.getDbInstance();
    if (!db) throw new Error("Storage not ready.");


    let dhtSeedValue = (await db.get("dht-seed"))?.value;
    let dhtSeedBuffer;
    if (!dhtSeedValue) {
        dhtSeedBuffer = crypto.randomBytes(32);
        await db.put("dht-seed", dhtSeedBuffer);
    } else {
        dhtSeedBuffer = ensureBuffer(dhtSeedValue);
    }

    dht = new DHT({
        port: config.dht.port,
        keyPair: DHT.keyPair(dhtSeedBuffer),
        bootstrap: config.dht.bootstrap
    });
    await dht.ready();

    let rpcSeed = (await db.get("rpc-seed"))?.value;
    if (!rpcSeed) {
        rpcSeed = crypto.randomBytes(32);
        await db.put("rpc-seed", rpcSeed);
    }

    keyPair = DHT.keyPair(ensureBuffer(rpcSeed));
    rpc = new RPC({ seed: ensureBuffer(rpcSeed), dht });
    rpcServer = rpc.createServer();

    rpcServer.respond("getLatestPrices", async (reqRaw) => {
        try {
            const req = JSON.parse(reqRaw.toString());
            const pairs = Array.isArray(req.pairs) ? req.pairs : [];
            const data = await storage.getLatestPrices(pairs);
            return Buffer.from(JSON.stringify({ success: true, data }));
        } catch (err) {
            return Buffer.from(JSON.stringify({ success: false, error: err.message }));
        }
    });

    rpcServer.respond("getHistoricalPrices", async (reqRaw) => {
        try {
            const req = JSON.parse(reqRaw.toString());
            if (!Array.isArray(req.pairs) || typeof req.from !== "number" || typeof req.to !== "number") {
                throw new Error("Missing required parameters.");
            }
            const data = await storage.getHistoricalPrices(req.pairs, req.from, req.to);
            return Buffer.from(JSON.stringify({ success: true, data }));
        } catch (err) {
            return Buffer.from(JSON.stringify({ success: false, error: err.message }));
        }
    });

    try {
        await rpcServer.listen();
        console.log("RPC Server listening");
    } catch (err) {
        await stopRPCServer();
        throw err;
    }
}

async function stopRPCServer() {
    if (rpcServer?.listening) await rpcServer.close();
    if (rpc) await rpc.destroy();
    if (dht) await dht.destroy();

    rpcServer = null;
    rpc = null;
    dht = null;
    keyPair = null;
}

function getPublicKey() {
    return keyPair?.publicKey?.toString("hex") || null;
}

module.exports = {
    startRPCServer,
    stopRPCServer,
    getPublicKey
};
