import { Agent } from "@atproto/api";
import type { BlobRef } from "@atproto/api";
import {
  PROJECT_COLLECTION,
  type ProjectRecord,
  type ProjectListItem,
} from "./project-types";

export async function listProjects(
  agent: Agent,
  did: string,
): Promise<ProjectListItem[]> {
  const response = await agent.com.atproto.repo.listRecords({
    repo: did,
    collection: PROJECT_COLLECTION,
    limit: 100,
  });

  return response.data.records
    .filter((record) => {
      const value = record.value as { type?: string };
      return value.type === "project";
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
  } catch {
    return null;
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

export async function uploadProjectImage(
  agent: Agent,
  file: File,
): Promise<BlobRef> {
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
