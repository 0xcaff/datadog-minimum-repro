import "isomorphic-fetch";
import { AgentPayload } from "./gen/agent_payload_pb.js";
import { gzip } from "node-gzip";
import { webcrypto as crypto } from "node:crypto";

async function main() {
  // await sendStats();
  await sendTraces();
}

const agentVersion = "7.43.1";
const sharedHeaders = {
  "dd-api-key": process.env.DD_API_KEY!,
};

const agentHostname = "test-host-name";
const env = "prod";

async function sendStats() {
  const response = await fetch(
    "https://trace.agent.datadoghq.com/api/v0.2/stats",
    {
      method: "POST",
      headers: {
        "X-Datadog-Reported-Languages": "javascript",
        "content-type": "application/msgpack",
        "content-encoding": "gzip",
        ...sharedHeaders,
      },
      body: await gzip(
        JSON.stringify({
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
        })
      ),
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
        chunks: [
          {
            priority: -128,
            spans: [
              {
                "meta": {
                  key: "value",
                },

                resource: "test.test",
                service: "serviceName",
                spanID: generateId(),
                traceID: generateId(),
                start: toNanos(new Date()),
                duration: millisToNanos(1000),
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
        "X-Datadog-Reported-Languages": "",
        ...sharedHeaders,
      },
      body: item.toBinary(),
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

function toNanos(date: Date) {
  return millisToNanos(+date);
}

function millisToNanos(value: number) {
  return BigInt(value) * 1000000n
}

function generateId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);

  const bytesHex = bytes.reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '')
  return BigInt(`0x${bytesHex}`);
}