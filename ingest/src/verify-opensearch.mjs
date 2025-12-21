import { signSigV4 } from "./lib/sigv4.mjs";

const DEFAULT_ENDPOINT = "https://09eid9cakc659fdreqsj.eu-central-1.aoss.amazonaws.com";
const endpoint = process.env.AOSS_ENDPOINT || DEFAULT_ENDPOINT;
const region = process.env.AWS_REGION || "eu-central-1";
const service = process.env.AOSS_SERVICE || "aoss";

function requireEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing ${name}. Run via aws-vault so credentials are exported, e.g.\n` +
        `  aws-vault exec resume-web-ingest -- pnpm ingest:verify\n`
    );
  }
  return v;
}

async function signedFetch(url, { method = "GET", headers = {}, body = "" } = {}) {
  const accessKeyId = requireEnv("AWS_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("AWS_SECRET_ACCESS_KEY");
  const sessionToken = process.env.AWS_SESSION_TOKEN;

  const signedHeaders = signSigV4({
    method,
    url,
    headers,
    body,
    region,
    service,
    accessKeyId,
    secretAccessKey,
    sessionToken
  });

  const res = await fetch(url, {
    method,
    headers: signedHeaders,
    body: body && method !== "GET" && method !== "HEAD" ? body : undefined
  });
  const text = await res.text();
  return { res, text };
}

async function main() {
  console.log(`AOSS endpoint: ${endpoint}`);
  console.log(`Region: ${region}  Service: ${service}`);

  // 1) Root endpoint is the simplest canary.
  const rootUrl = new URL(endpoint);
  rootUrl.pathname = "/";

  const { res: rootRes, text: rootText } = await signedFetch(rootUrl.toString());
  console.log(`GET / -> ${rootRes.status} ${rootRes.statusText}`);
  console.log(rootText.slice(0, 500));

  // 2) Optional: attempt cat indices (may be restricted depending on serverless policies).
  const catUrl = new URL(endpoint);
  catUrl.pathname = "/_cat/indices";
  catUrl.searchParams.set("format", "json");

  try {
    const { res: catRes, text: catText } = await signedFetch(catUrl.toString());
    console.log(`\nGET /_cat/indices?format=json -> ${catRes.status} ${catRes.statusText}`);
    console.log(catText.slice(0, 800));
  } catch (e) {
    console.log(`\n/_cat/indices check failed: ${e?.message || String(e)}`);
  }
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});


