import "isomorphic-fetch";
import { AgentPayload } from "./gen/agent_payload_pb.js";
import * as msgpack from "@msgpack/msgpack";
import { gzip } from "node-gzip";

async function main() {
    await sendStats();
    await sendTraces();
}

const sharedHeaders = {
    "dd-api-key": process.env.DD_API_KEY!,
    "user-agent": "Datadog Trace Agent/6.0.0/aaaaaa",
};

const agentHostname = "test-host-name";
const env = "prod";
const agentVersion = "6.0.0";

async function sendStats() {
    // todo: gzip
    const response = await fetch(
        "https://trace.agent.datadoghq.com/api/v0.2/stats",
        {
            method: "POST",
            headers: {
                "X-Datadog-Reported-Languages": "javascript",
                "content-type": "application/msgpack",
                ...sharedHeaders,
            },
            body: msgpack.encode({
                agentHostname,
                agentEnv: env,
                agentVersion,
                stats: [
                    {
                        stats: [
                            {
                                start: Number(BigInt(Date.now()) * 1000n),
                                duration: Number(10n * 1000n * 1000n),
                                stats: [
                                    {
                                        hits: 3,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            }),
        }
    );

    const body = await response.text();
    console.log({
        body,
        status: response.status,
        statusText: response.statusText,
    });
}

async function sendTraces() {
    const item = new AgentPayload({
        hostName: agentHostname,
        env,
        agentVersion,
        tracerPayloads: [
            {
                languageName: "javascript",
                chunks: [
                    {
                        priority: -128,
                        spans: [
                            {
                                service: "serviceName",
                                name: "spanName",
                                spanID: 1798345774990023584n,
                                traceID: 5612212936180398772n,
                                type: "web",
                                start: BigInt(Date.now()) * 1000n,
                                duration: 10n * 1000n * 1000n,
                                resource: "resourceName",
                            },
                        ],
                    },
                ],
            },
        ],
    });

    const response = await fetch(
        "https://trace.agent.datadoghq.com/api/v0.2/traces",
        {
            method: "POST",
            headers: {
                "content-type": "application/x-protobuf",
                "content-encoding": "gzip",
                "X-Datadog-Reported-Languages": "javascript",
                ...sharedHeaders,
            },
            body: await gzip(item.toBinary()),
        }
    );

    const body = await response.text();
    console.log({
        body,
        status: response.status,
        statusText: response.statusText,
    });
}

main();

