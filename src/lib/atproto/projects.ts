import { Agent } from "@atproto/api";
import type { BlobRef } from "@atproto/api";
import {
  PROJECT_COLLECTION,
  type ProjectRecord,
  type ProjectListItem,
} from "./project-types";

function isProjectRecord(value: unknown): value is { type: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as Record<string, unknown>).type === "string"
  );
}

export async function listProjects(
  agent: Agent,
  did: string,
): Promise<ProjectListItem[]> {
  try {
    const response = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: PROJECT_COLLECTION,
      limit: 100,
    });

    return response.data.records
      .filter((record) => {
        return isProjectRecord(record.value) && record.value.type === "project";
      })
      .map((record) => {
        const uriParts = record.uri.split("/");
        const rkey = uriParts[uriParts.length - 1];
        return {
          uri: record.uri,
          cid: record.cid,
          rkey,
          value: record.value as ProjectRecord,
        };
      });
  } catch (err) {
    console.error("listProjects failed:", err);
    throw err;
  }
}

export async function getProject(
  agent: Agent,
  did: string,
  rkey: string,
): Promise<ProjectListItem | null> {
  try {
    const response = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: PROJECT_COLLECTION,
      rkey,
    });

    return {
      uri: response.data.uri,
      cid: response.data.cid ?? "",
      rkey,
      value: response.data.value as ProjectRecord,
    };
  } catch (err) {
    // Only return null for genuine "record not found" errors
    if (
      err instanceof Error &&
      (err.message.includes("RecordNotFound") ||
        err.message.includes("Record not found") ||
        (typeof (err as { status?: unknown }).status === "number" &&
          (err as { status?: number }).status === 400 &&
          err.message.includes("not found")))
    ) {
      return null;
    }
    // Re-throw network failures, auth errors, server errors, etc.
    throw err;
  }
}

function generateTid(): string {
  // TID = 13 chars from base32sortable: 234567abcdefghijklmnopqrstuvwxyz
  const CHARS = '234567abcdefghijklmnopqrstuvwxyz';
  // Use microsecond timestamp encoded in base-32
  const now = Date.now() * 1000; // microseconds (safe up to ~2255 in JS number precision)
  let tid = '';
  let remaining = now;
  for (let i = 0; i < 13; i++) {
    tid = CHARS[remaining % 32] + tid;
    remaining = Math.floor(remaining / 32);
  }
  return tid;
}

export async function createProject(
  agent: Agent,
  did: string,
  record: Omit<ProjectRecord, "$type">,
): Promise<{ uri: string; cid: string; rkey: string }> {
  const rkey = generateTid();

  const response = await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: PROJECT_COLLECTION,
    rkey,
    record: { $type: PROJECT_COLLECTION, ...record },
  });

  return {
    uri: response.data.uri,
    cid: response.data.cid,
    rkey,
  };
}

export async function updateProject(
  agent: Agent,
  did: string,
  rkey: string,
  record: Omit<ProjectRecord, "$type">,
): Promise<void> {
  await agent.com.atproto.repo.putRecord({
    repo: did,
    collection: PROJECT_COLLECTION,
    rkey,
    record: { $type: PROJECT_COLLECTION, ...record },
  });
}

export async function deleteProject(
  agent: Agent,
  did: string,
  rkey: string,
): Promise<void> {
  await agent.com.atproto.repo.deleteRecord({
    repo: did,
    collection: PROJECT_COLLECTION,
    rkey,
  });
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadProjectImage(
  agent: Agent,
  file: File,
): Promise<BlobRef> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Allowed: JPEG, PNG, WebP');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('File too large. Maximum size: 10MB');
  }
  const buffer = await file.arrayBuffer();
  const response = await agent.com.atproto.repo.uploadBlob(
    new Uint8Array(buffer),
    { encoding: file.type },
  );
  return response.data.blob;
}

export function getProjectImageUrl(
  pdsUrl: string,
  did: string,
  cid: string,
): string {
  return `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${did}&cid=${cid}`;
}
