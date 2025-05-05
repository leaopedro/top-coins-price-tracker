const Hypercore = require("hypercore");
const Hyperbee = require("hyperbee");
const config = require("./config");

let core = null;
let db = null;

async function initializeStorage() {
    if (core) return;
    console.log(`Storage initializing at ${config.hyperbee.storageDir}`);
    core = new Hypercore(config.hyperbee.storageDir);
    await core.ready();

    db = new Hyperbee(core, {
        keyEncoding: config.hyperbee.keyEncoding,
        valueEncoding: config.hyperbee.valueEncoding,
    });
    await db.ready();

    console.log("Storage Ready");
}

async function storePriceData(data) {
    if (!Array.isArray(data) || !db) return;
    const batch = db.batch();

    for (const item of data) {
        if (item?.symbol && item?.timestamp && item?.averagePriceUsdt !== undefined) {
            const key = `${item.symbol}!${item.timestamp}`;
            await batch.put(key, item);
        }
    }

    try {
        await batch.flush();
        console.log(`Stored ${data.length} entries.`);
    } catch (err) {
        console.error("Storage: Batch flush error:", err);
    }
}

async function getLatestPrices(symbols = []) {
    if (!db) return [];

    const results = {};
    const targets = symbols.map(s => s.toUpperCase());
    const fetchAll = targets.length === 0;

    for await (const { key, value } of db.createReadStream({ reverse: true })) {
        if (!key || !value) continue;

        const symbol = key.split("!")[0];
        if (results[symbol]) continue;
        if (!fetchAll && !targets.includes(symbol)) continue;

        results[symbol] = value;

        if (!fetchAll && Object.keys(results).length === targets.length) break;
    }

    return Object.values(results);
}

async function getHistoricalPrices(symbols, from, to) {
    if (!db || !Array.isArray(symbols)) return {};

    const results = {};
    for (const symbol of symbols) {
        const upper = symbol.toUpperCase();
        const gte = `${upper}!${new Date(from).toISOString()}`;
        const lte = `${upper}!${new Date(to).toISOString()}`;
        results[upper] = [];

        for await (const { value } of db.createReadStream({ gte, lte })) {
            if (value) results[upper].push(value);
        }
    }

    return results;
}

async function closeStorage() {
    if (db) await db.close();
    if (core) await core.close();
    db = core = null;
    console.log("Storage: Closed.");
}

function getDbInstance() {
    return db || null;
}

module.exports = {
    initializeStorage,
    storePriceData,
    getLatestPrices,
    getHistoricalPrices,
    closeStorage,
    getDbInstance,
};
