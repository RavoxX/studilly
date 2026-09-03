import "server-only";

import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * Importing a page from the web as material.
 *
 * The URL comes from the student, and this runs on our server with our
 * network position, so it is a server-side request forgery hazard by
 * construction: left unguarded it would happily fetch the metadata endpoint
 * of the host it runs on, or anything else reachable on the private network.
 *
 * So every hop is checked. The hostname is resolved first and the resulting
 * addresses are tested against the private, loopback, link-local and
 * multicast ranges; redirects are followed by hand rather than by fetch, so a
 * public URL cannot redirect to a private one; and the body is read with a cap
 * so a hostile server cannot stream indefinitely.
 */

export type WebImport =
  | { ok: true; title: string; text: string; finalUrl: string }
  | { ok: false; reason: WebImportError };

export type WebImportError =
  | "invalid_url"
  | "blocked"
  | "unreachable"
  | "unsupported_type"
  | "too_large"
  | "no_text";

/** Enough for any article; well short of anything worth streaming at us. */
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15_000;

export async function importWebPage(rawUrl: string): Promise<WebImport> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  // Everything else — file:, data:, gopher:, ftp: — is a way to read something
  // that is not a web page.
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, reason: "invalid_url" };
  }

  let response: Response;
  try {
    response = await fetchGuarded(url);
  } catch (error) {
    if (error instanceof BlockedAddressError) return { ok: false, reason: "blocked" };
    return { ok: false, reason: "unreachable" };
  }

  if (!response.ok) return { ok: false, reason: "unreachable" };

  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  const isHtml = contentType.includes("text/html") || contentType.includes("application/xhtml");
  const isText = contentType.startsWith("text/") || contentType.includes("json");

  if (!isHtml && !isText) return { ok: false, reason: "unsupported_type" };

  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > MAX_BYTES) return { ok: false, reason: "too_large" };

  let body: string;
  try {
    body = await readCapped(response);
  } catch {
    return { ok: false, reason: "too_large" };
  }

  const finalUrl = response.url || url.toString();
  const { title, text } = isHtml
    ? readableFromHtml(body)
    : { title: "", text: body };

  if (text.trim().length < 80) return { ok: false, reason: "no_text" };

  return {
    ok: true,
    title: (title || hostTitle(finalUrl)).slice(0, 200),
    text,
    finalUrl,
  };
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

class BlockedAddressError extends Error {}

/**
 * Fetches a URL, checking the destination address at every redirect.
 *
 * `redirect: "manual"` is what makes the check meaningful: with fetch's own
 * redirect handling, only the first hop would ever be validated and a
 * public host could bounce us anywhere.
 */
async function fetchGuarded(start: URL): Promise<Response> {
  let url = start;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicHost(url.hostname);

    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        // Named honestly. A server that does not want to be read by a tool
        // can say so, and some will serve a simpler page to one.
        "user-agent": "StudillyBot/1.0 (+https://studilly.ravoxx.dev)",
        accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1",
        "accept-language": "de,en;q=0.8",
      },
    });

    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      url = new URL(location, url);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        throw new BlockedAddressError("redirect left http(s)");
      }
      continue;
    }

    return response;
  }

  throw new Error("too many redirects");
}

/** Rejects a hostname that resolves to anything not on the public internet. */
async function assertPublicHost(hostname: string): Promise<void> {
  const literal = hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(literal)) {
    if (isPrivateAddress(literal)) throw new BlockedAddressError(literal);
    return;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new BlockedAddressError(hostname);
  }

  if (addresses.length === 0) throw new BlockedAddressError(hostname);
  // Every record has to be public: one private answer in a round-robin is
  // enough for a rebinding attempt to land.
  for (const { address } of addresses) {
    if (isPrivateAddress(address)) throw new BlockedAddressError(address);
  }
}

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const [a = 0, b = 0] = parts;
    return (
      a === 0 || // this network
      a === 10 || // private
      a === 127 || // loopback
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      (a === 169 && b === 254) || // link-local, incl. cloud metadata
      (a === 172 && b >= 16 && b <= 31) || // private
      (a === 192 && b === 168) || // private
      (a === 198 && (b === 18 || b === 19)) || // benchmarking
      a >= 224 // multicast and reserved
    );
  }

  const address = ip.toLowerCase();
  // IPv4 written as IPv6 is still IPv4.
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isPrivateAddress(mapped[1]);

  return (
    address === "::" ||
    address === "::1" ||
    address.startsWith("fc") || // unique local
    address.startsWith("fd") ||
    address.startsWith("fe80") || // link-local
    address.startsWith("ff") // multicast
  );
}

/** Reads a body, stopping rather than trusting content-length. */
async function readCapped(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new Error("body exceeded cap");
    }
    chunks.push(value);
  }

  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8").decode(joined);
}

// ---------------------------------------------------------------------------
// HTML to text
// ---------------------------------------------------------------------------

/**
 * The readable text of a page.
 *
 * Deliberately a stripper rather than a DOM parse: the output is chunked and
 * embedded, so what matters is that the prose survives and the furniture does
 * not. Nothing here is ever rendered as markup, which is why removing script
 * and style is about noise rather than safety.
 */
export function readableFromHtml(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1] ? decodeEntities(stripTags(titleMatch[1])).trim() : "";

  let body = html;

  // Whole subtrees that are never content.
  for (const tag of ["script", "style", "noscript", "svg", "head", "template", "iframe"]) {
    body = body.replace(new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
  }
  // Page furniture. Kept separate because a page occasionally puts real text
  // in an <aside>, so this is the line between "noise" and "never content".
  for (const tag of ["nav", "header", "footer", "form"]) {
    body = body.replace(new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
  }

  // Block boundaries become paragraph breaks so the chunker has something to
  // split on and the text does not arrive as one run-on line.
  body = body
    .replace(/<\/(p|div|section|article|li|tr|h[1-6]|blockquote)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ");

  const text = decodeEntities(stripTags(body))
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title, text };
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ");
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
    auml: "ä", ouml: "ö", uuml: "ü", Auml: "Ä", Ouml: "Ö", Uuml: "Ü",
    szlig: "ß", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç",
    mdash: "—", ndash: "–", hellip: "…", laquo: "«", raquo: "»",
    bdquo: "„", ldquo: "“", rdquo: "”", sbquo: "‚", lsquo: "‘", rsquo: "’",
    deg: "°", euro: "€", copy: "©", reg: "®", middot: "·", times: "×",
  };

  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, dec: string) =>
      String.fromCodePoint(Number(dec)),
    )
    .replace(/&([a-z]+);/gi, (whole, name: string) => named[name] ?? whole);
}

function hostTitle(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Webseite";
  }
}
