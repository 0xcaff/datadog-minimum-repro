import "isomorphic-fetch";
import { AgentPayload } from "./gen/agent_payload_pb.js";
import { gzip } from "node-gzip";
import { Packr } from "msgpackr";
import { webcrypto as crypto } from "node:crypto";
import { LogCollapsingLowestDenseDDSketch } from "@datadog/sketches-js";

const service = "serviceName";

async function main() {
  await sendStats();
  await sendTraces();
}

const agentVersion = "7.43.1";
const sharedHeaders = {
  "dd-api-key": process.env.DD_API_KEY!,
};

const agentHostname = "test-host-name";
const env = "prod";

async function sendStats() {
  const packr = new Packr();

  const okSummary = new LogCollapsingLowestDenseDDSketch({
    relativeAccuracy: 0.00775,
  });
  okSummary.accept(Number(millisToNanos(1000)));

  const errorSummary = new LogCollapsingLowestDenseDDSketch({
    relativeAccuracy: 0.00775,
  });

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
        packr.pack({
          AgentHostname: agentHostname,
          AgentEnv: env,
          Stats: [
            {
              Hostname: agentHostname,
              Env: env,
              Version: "1.0.0",
              Stats: [
                {
                  Start: toNanos(new Date()),
                  Duration: 10000000000,
                  Stats: [
                    {
                      Service: service,
                      Name: resource,
                      Resource: resource,
                      HTTPStatusCode: 0,
                      Type: "",
                      DBType: "",
                      Hits: 1,
                      Errors: 0,
                      Duration: millisToNanos(1000),
                      OkSummary: {
                        type: "Buffer",
                        data: okSummary.toProto(),
                      },
                      ErrorSummary: {
                        type: "Buffer",
                        data: errorSummary.toProto(),
                      },
                      Synthetics: false,
                      TopLevelHits: 1,
                    },
                  ],
                  AgentTimeShift: 0,
                },
              ],
              Lang: "",
              TracerVersion: "",
              RuntimeID: "",
              Sequence: 0,
              AgentAggregation: "",
              Service: "",
              ContainerID: "",
              Tags: [],
            },
          ],
          AgentVersion: agentVersion,
          ClientComputed: false,
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

const resource = "test.test";

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
                meta: {
                  key: "value",
                },

                resource,
                service,
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
  return BigInt(value) * 1000000n;
}

function generateId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);

  const bytesHex = bytes.reduce(
    (acc, byte) => acc + byte.toString(16).padStart(2, "0"),
    ""
  );
  return BigInt(`0x${bytesHex}`);
}
