import crypto from "node:crypto";

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function hmac(key, data, encoding) {
  return crypto.createHmac("sha256", key).update(data).digest(encoding);
}

function toAmzDate(date) {
  // YYYYMMDD'T'HHMMSS'Z'
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return iso;
}

function toDateStamp(amzDate) {
  return amzDate.slice(0, 8);
}

function encodeRfc3986(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function canonicalQueryString(url) {
  const pairs = [];
  for (const [k, v] of url.searchParams.entries()) {
    pairs.push([encodeRfc3986(k), encodeRfc3986(v)]);
  }
  pairs.sort(([ak, av], [bk, bv]) => (ak === bk ? (av < bv ? -1 : av > bv ? 1 : 0) : ak < bk ? -1 : 1));
  return pairs.map(([k, v]) => `${k}=${v}`).join("&");
}

function canonicalHeaders(headers) {
  const lowered = [];
  for (const [k, v] of Object.entries(headers)) {
    lowered.push([k.toLowerCase().trim(), String(v).trim().replace(/\s+/g, " ")]);
  }
  lowered.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const headerLines = lowered.map(([k, v]) => `${k}:${v}\n`).join("");
  const signedHeaders = lowered.map(([k]) => k).join(";");
  return { headerLines, signedHeaders };
}

function getSigningKey(secretAccessKey, dateStamp, region, service) {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  return kSigning;
}

export function signSigV4({
  method,
  url,
  headers = {},
  body = "",
  region,
  service,
  accessKeyId,
  secretAccessKey,
  sessionToken
}) {
  const u = typeof url === "string" ? new URL(url) : url;
  const now = new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = toDateStamp(amzDate);

  const payloadHash = sha256Hex(body || "");

  const baseHeaders = {
    host: u.host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    ...headers
  };
  if (sessionToken) {
    baseHeaders["x-amz-security-token"] = sessionToken;
  }

  const canonicalUri = u.pathname || "/";
  const canonicalQuery = canonicalQueryString(u);
  const { headerLines, signedHeaders } = canonicalHeaders(baseHeaders);
  const canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    canonicalQuery,
    headerLines,
    signedHeaders,
    payloadHash
  ].join("\n");

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest)
  ].join("\n");

  const signingKey = getSigningKey(secretAccessKey, dateStamp, region, service);
  const signature = hmac(signingKey, stringToSign, "hex");

  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    ...baseHeaders,
    Authorization: authorization
  };
}


