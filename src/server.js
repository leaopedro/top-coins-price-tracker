require('dotenv').config();
const dataGatherer = require("./data-gatherer");
const storage = require("./storage");
const rpcServer = require("./rpc-server");
const config = require("./config");

let pipelineIntervalId = null;

const isSingleRun = process.argv.includes('--single');
const intervalArgIndex = process.argv.indexOf('--interval');
const customInterval = intervalArgIndex > -1 ? parseInt(process.argv[intervalArgIndex + 1], 10) : null;
const intervalMs = customInterval || config.pipeline.intervalMs;

if (customInterval && isNaN(customInterval)) {
    console.error("Invalid --interval value. Must be a number in milliseconds.");
    process.exit(1);
}

async function runPipelineCycle() {
    try {
        console.log("Pipeline: Fetching data...");
        const data = await dataGatherer.gatherData();
        if (data?.length) await storage.storePriceData(data);
        console.log("Pipeline: Done.");
    } catch (err) {
        console.error("Pipeline error:", err);
    }
}

function startPipelineLoop() {
    if (pipelineIntervalId) return;
    runPipelineCycle();
    pipelineIntervalId = setInterval(runPipelineCycle, intervalMs);
    console.log(`Pipeline loop started (interval: ${intervalMs}ms)`);
}

function stopPipelineLoop() {
    if (!pipelineIntervalId) return;
    clearInterval(pipelineIntervalId);
    pipelineIntervalId = null;
}

async function shutdown() {
    console.log("Shutting down...");
    stopPipelineLoop();
    await rpcServer.stopRPCServer();
    await storage.closeStorage();
    process.exit(0);
}

async function main() {
    try {
        await storage.initializeStorage();
        console.log("Top Coins price tracker running.");

        if (isSingleRun) {
            await runPipelineCycle();
            await storage.closeStorage();
            console.log("Single run complete.");
            process.exit(0);
        }

        startPipelineLoop();
        await rpcServer.startRPCServer();
        console.log("Server Key:", rpcServer.getPublicKey());

    } catch (err) {
        console.error("Startup error:", err);
        await shutdown();
    }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

main();
