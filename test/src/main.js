const tracer = require('dd-trace').init({
    flushMinSpans: 1,
    logLevel: 'debug'
});

async function main() {
    await tracer.trace('test.test', async () => {
        await sleep(1000);
    });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(() => resolve(), ms));
}


main();

