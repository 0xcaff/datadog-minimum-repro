import "isomorphic-fetch";
import { AgentPayload } from "./gen/agent_payload_pb.js";
import { gzip } from "node-gzip";
import { Packr } from "msgpackr";
import { webcrypto as crypto } from "node:crypto";
import { randomUUID } from "crypto";

const serviceName = "test-service";
const resourceName = "test-resource";

async function main() {
  const runtimeId = randomUUID();

  await sendAppStarted(runtimeId);
  await sendStats();
  await sendTraces(runtimeId);
}

const agentVersion = "7.43.1";
const sharedHeaders = {
  "dd-api-key": process.env.DD_API_KEY!,
};

const agentHostname = "test-host-name";
const env = "prod";

async function sendStats() {
  const packr = new Packr();
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
              Env: "none",
              Version: "1.0.0",
              Stats: [
                {
                  Start: millisToNanos(Date.now()),
                  Duration: 10000000000,
                  Stats: [
                    {
                      Service: serviceName,
                      Name: resourceName,
                      Resource: resourceName,
                      HTTPStatusCode: 0,
                      Type: "",
                      DBType: "",
                      Hits: 1,
                      Errors: 0,
                      Duration: millisToNanos(1000),
                      OkSummary: {
                        type: "Buffer",
                        data: [
                          10, 9, 9, 253, 74, 129, 90, 191, 82, 240, 63, 18, 13,
                          18, 8, 0, 0, 0, 0, 0, 0, 240, 63, 24, 152, 16, 26, 0,
                        ],
                      },
                      ErrorSummary: {
                        type: "Buffer",
                        data: [
                          10, 9, 9, 253, 74, 129, 90, 191, 82, 240, 63, 18, 0,
                          26, 0,
                        ],
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

async function sendTraces(runtimeId: string) {
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
                  "runtime-id": runtimeId,
                },
                metrics: {

                  "_dd.agent_psr": 1,
                  "_dd.measured": 1,
                  "_dd.top_level": 1,
                  "_sampling_priority_v1": 1,
                  "_top_level": 1,
                },

                resource: resourceName,
                service: serviceName,
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

async function sendAppStarted(runtimeId: string) {
  const response = await fetch(
    "https://instrumentation-telemetry-intake.datadoghq.com/api/v2/apmtelemetry",
    {
      method: "POST",
      body: JSON.stringify({
        api_version: "v1",
        request_type: "app-started",
        tracer_time: Math.floor(Date.now() / 1000),
        runtime_id: runtimeId,
        seq_id: 1,
        payload: {
          integrations: [],
          dependencies: [],
          configuration: [
            {
              name: "debug",
              value: false,
            },
            {
              name: "logger",
            },
            {
              name: "logLevel",
              value: "debug",
            },
            {
              name: "tags.service",
              value: serviceName,
            },
            {
              name: "tags.env",
            },
            {
              name: "tags.version",
              value: "1.0.0",
            },
            {
              name: "tags.runtime-id",
              value: runtimeId,
            },
            {
              name: "tracing",
              value: true,
            },
            {
              name: "dbmPropagationMode",
              value: "disabled",
            },
            {
              name: "logInjection",
              value: false,
            },
            {
              name: "env",
            },
            {
              name: "url",
            },
            {
              name: "site",
              value: "datadoghq.com",
            },
            {
              name: "hostname",
              value: "127.0.0.1",
            },
            {
              name: "port",
              value: "8126",
            },
            {
              name: "flushInterval",
              value: 2000,
            },
            {
              name: "flushMinSpans",
              value: 1,
            },
            {
              name: "sampleRate",
              value: 1,
            },
            {
              name: "queryStringObfuscation",
              value:
                '(?:p(?:ass)?w(?:or)?d|pass(?:_?phrase)?|secret|(?:api_?|private_?|public_?|access_?|secret_?)key(?:_?id)?|token|consumer_?(?:id|key|secret)|sign(?:ed|ature)?|auth(?:entication|orization)?)(?:(?:\\s|%20)*(?:=|%3D)[^&]+|(?:"|%22)(?:\\s|%20)*(?::|%3A)(?:\\s|%20)*(?:"|%22)(?:%2[^2]|%[^2]|[^"%])+(?:"|%22))|bearer(?:\\s|%20)+[a-z0-9\\._\\-]+|token(?::|%3A)[a-z0-9]{13}|gh[opsu]_[0-9a-zA-Z]{36}|ey[I-L](?:[\\w=-]|%3D)+\\.ey[I-L](?:[\\w=-]|%3D)+(?:\\.(?:[\\w.+\\/=-]|%3D|%2F|%2B)+)?|[\\-]{5}BEGIN(?:[a-z\\s]|%20)+PRIVATE(?:\\s|%20)KEY[\\-]{5}[^\\-]+[\\-]{5}END(?:[a-z\\s]|%20)+PRIVATE(?:\\s|%20)KEY|ssh-rsa(?:\\s|%20)*(?:[a-z0-9\\/\\.+]|%2F|%5C|%2B){100,}',
            },
            {
              name: "clientIpEnabled",
              value: false,
            },
            {
              name: "clientIpHeader",
              value: null,
            },
            {
              name: "plugins",
              value: true,
            },
            {
              name: "service",
              value: "test",
            },
            {
              name: "version",
              value: "1.0.0",
            },
            {
              name: "dogstatsd.hostname",
              value: "127.0.0.1",
            },
            {
              name: "dogstatsd.port",
              value: "8125",
            },
            {
              name: "runtimeMetrics",
              value: false,
            },
            {
              name: "tracePropagationStyle.inject.0",
              value: "tracecontext",
            },
            {
              name: "tracePropagationStyle.inject.1",
              value: "datadog",
            },
            {
              name: "experimental.runtimeId",
              value: false,
            },
            {
              name: "experimental.exporter",
            },
            {
              name: "experimental.enableGetRumData",
              value: false,
            },
            {
              name: "sampler.sampleRate",
            },
            {
              name: "sampler.rateLimit",
            },
            {
              name: "reportHostname",
              value: false,
            },
            {
              name: "scope",
            },
            {
              name: "profiling.enabled",
              value: false,
            },
            {
              name: "profiling.sourceMap",
              value: true,
            },
            {
              name: "profiling.exporters",
              value: "agent",
            },
            {
              name: "lookup",
            },
            {
              name: "startupLogs",
              value: false,
            },
            {
              name: "telemetryEnabled",
              value: true,
            },
            {
              name: "protocolVersion",
              value: "0.4",
            },
            {
              name: "tagsHeaderMaxLength",
              value: 512,
            },
            {
              name: "appsec.enabled",
            },
            {
              name: "appsec.rules",
            },
            {
              name: "appsec.rateLimit",
              value: 100,
            },
            {
              name: "appsec.wafTimeout",
              value: 5000,
            },
            {
              name: "appsec.obfuscatorKeyRegex",
              value:
                "(?i)(?:p(?:ass)?w(?:or)?d|pass(?:_?phrase)?|secret|(?:api_?|private_?|public_?)key)|token|consumer_?(?:id|key|secret)|sign(?:ed|ature)|bearer|authorization",
            },
            {
              name: "appsec.obfuscatorValueRegex",
              value:
                '(?i)(?:p(?:ass)?w(?:or)?d|pass(?:_?phrase)?|secret|(?:api_?|private_?|public_?|access_?|secret_?)key(?:_?id)?|token|consumer_?(?:id|key|secret)|sign(?:ed|ature)?|auth(?:entication|orization)?)(?:\\s*=[^;]|"\\s*:\\s*"[^"]+")|bearer\\s+[a-z0-9\\._\\-]+|token:[a-z0-9]{13}|gh[opsu]_[0-9a-zA-Z]{36}|ey[I-L][\\w=-]+\\.ey[I-L][\\w=-]+(?:\\.[\\w.+\\/=-]+)?|[\\-]{5}BEGIN[a-z\\s]+PRIVATE\\sKEY[\\-]{5}[^\\-]+[\\-]{5}END[a-z\\s]+PRIVATE\\sKEY|ssh-rsa\\s*[a-z0-9\\/\\.+]{100,}',
            },
            {
              name: "appsec.blockedTemplateHtml",
              value:
                "/Users/martin/projects/datadog-minimum-repro/test/node_modules/dd-trace/packages/dd-trace/src/appsec/templates/blocked.html",
            },
            {
              name: "appsec.blockedTemplateJson",
              value:
                "/Users/martin/projects/datadog-minimum-repro/test/node_modules/dd-trace/packages/dd-trace/src/appsec/templates/blocked.json",
            },
            {
              name: "remoteConfig.enabled",
              value: true,
            },
            {
              name: "remoteConfig.pollInterval",
              value: 5,
            },
            {
              name: "iast.enabled",
              value: false,
            },
            {
              name: "iast.requestSampling",
              value: 30,
            },
            {
              name: "iast.maxConcurrentRequests",
              value: 2,
            },
            {
              name: "iast.maxContextOperations",
              value: 2,
            },
            {
              name: "isCiVisibility",
              value: false,
            },
            {
              name: "isIntelligentTestRunnerEnabled",
              value: false,
            },
            {
              name: "isGitUploadEnabled",
              value: false,
            },
            {
              name: "stats.enabled",
              value: false,
            },
          ],
          additional_payload: [],
        },
        application: {
          service_name: serviceName,
          service_version: "1.0.0",
          tracer_version: "3.15.0",
          language_name: "nodejs",
          language_version: "16.17.0",
        },
        host: {
          hostname: agentHostname,
          os: "Darwin",
          architecture: "arm64",
          kernel_version:
            "Darwin Kernel Version 21.6.0: Sat Jun 18 17:07:22 PDT 2022; root:xnu-8020.140.41~1/RELEASE_ARM64_T6000",
          kernel_release: "21.6.0",
          kernel_name: "Darwin",
        },
      }),
      headers: {
        "dd-agent-env": env,
        "dd-agent-hostname": agentHostname,
        "Dd-Telemetry-Api-Version": "1",
        "Dd-Telemetry-Request-Type": "app-started",
        ...sharedHeaders,
      },
    }
  );

  const body = await response.text();

  console.log({
    body,
    status: response.status,
    statusText: response.statusText,
  });
}
