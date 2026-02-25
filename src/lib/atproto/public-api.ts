/**
 * Public AT Protocol API functions.
 *
 * These functions fetch AT Protocol records WITHOUT authentication using
 * public XRPC endpoints. They use plain fetch() — no Agent class required.
 */

import type { CertifiedProfile } from "./types";
import type { ProjectRecord } from "./project-types";

const PROFILE_COLLECTION = "app.certified.actor.profile";
const PROJECT_COLLECTION = "org.hypercerts.claim.collection";

interface DidDocument {
  id: string;
  service?: Array<{
    id: string;
    type: string;
    serviceEndpoint: string;
  }>;
}

/**
 * Resolve a DID to its PDS service endpoint URL.
 *
 * - For `did:plc:` DIDs, fetches from `https://plc.directory/{did}`
 * - For `did:web:` DIDs, fetches from `https://{domain}/.well-known/did.json`
 *
 * @throws Error if the DID cannot be resolved
 */
export async function resolveDidToPds(did: string): Promise<string> {
  let url: string;

  if (did.startsWith("did:plc:")) {
    url = `https://plc.directory/${did}`;
  } else if (did.startsWith("did:web:")) {
    // did:web:example.com  → https://example.com/.well-known/did.json
    // did:web:example.com:path:to → https://example.com/path/to/did.json
    const withoutPrefix = did.slice("did:web:".length);
    const parts = withoutPrefix.split(":");
    const domain = parts[0];
    const path = parts.length > 1 ? parts.slice(1).join("/") : ".well-known";
    url = `https://${domain}/${path}/did.json`;
  } else {
    throw new Error(`Unsupported DID method: ${did}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch DID document: HTTP ${response.status}`);
  }

  let doc: DidDocument;
  try {
    doc = (await response.json()) as DidDocument;
  } catch {
    throw new Error("Failed to parse DID document as JSON");
  }

  if (!Array.isArray(doc.service)) {
    throw new Error("DID document has no service array");
  }

  const pdsService = doc.service.find(
    (s) => s.id === "#atproto_pds" || s.id.endsWith("#atproto_pds")
  );

  if (!pdsService) {
    throw new Error("DID document has no #atproto_pds service");
  }

  if (
    !pdsService.serviceEndpoint ||
    typeof pdsService.serviceEndpoint !== "string"
  ) {
    throw new Error("DID document #atproto_pds service has no endpoint");
  }

  return pdsService.serviceEndpoint;
}

/**
 * Fetch a single AT Protocol record from a public XRPC endpoint.
 * No authentication required.
 *
 * @param pdsUrl - The PDS base URL (e.g. "https://otp.certs.network")
 * @param did - The repo DID
 * @param collection - The NSID collection (e.g. "app.certified.actor.profile")
 * @param rkey - The record key
 * @returns The record or null if not found / on error
 */
export async function getPublicRecord(
  pdsUrl: string,
  did: string,
  collection: string,
  rkey: string
): Promise<{ uri: string; cid: string; value: unknown } | null> {
  const params = new URLSearchParams({
    repo: did,
    collection,
    rkey,
  });

  const url = `${pdsUrl}/xrpc/com.atproto.repo.getRecord?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    // Bluesky PDS returns 400 for missing records; others return 404.
    // Treat both as "not found" to avoid breaking the page.
    if (response.status === 400 || response.status === 404) {
      return null;
    }
    throw new Error(
      `Failed to fetch record: HTTP ${response.status}`
    );
  }

  const data = (await response.json()) as {
    uri: string;
    cid: string;
    value: unknown;
  };

  return {
    uri: data.uri,
    cid: data.cid,
    value: data.value,
  };
}

/**
 * Fetch a user's profile record from the public XRPC endpoint.
 *
 * @param pdsUrl - The PDS base URL
 * @param did - The user's DID
 * @returns The profile record or null if not found
 */
export async function getPublicProfile(
  pdsUrl: string,
  did: string
): Promise<CertifiedProfile | null> {
  const record = await getPublicRecord(pdsUrl, did, PROFILE_COLLECTION, "self");
  if (!record) return null;
  return record.value as CertifiedProfile;
}

/**
 * Fetch a project record from the public XRPC endpoint.
 *
 * @param pdsUrl - The PDS base URL
 * @param did - The project owner's DID
 * @param rkey - The project record key
 * @returns The project record or null if not found
 */
export async function getPublicProject(
  pdsUrl: string,
  did: string,
  rkey: string
): Promise<ProjectRecord | null> {
  const record = await getPublicRecord(pdsUrl, did, PROJECT_COLLECTION, rkey);
  if (!record) return null;
  return record.value as ProjectRecord;
}
