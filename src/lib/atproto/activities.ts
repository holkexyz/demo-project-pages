import { Agent } from "@atproto/api";
import {
  ACTIVITY_COLLECTION,
  type ActivityRecord,
  type ActivityListItem,
} from "./activity-types";

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

export async function listActivities(
  agent: Agent,
  did: string,
): Promise<ActivityListItem[]> {
  try {
    const response = await agent.com.atproto.repo.listRecords({
      repo: did,
      collection: ACTIVITY_COLLECTION,
      limit: 100,
    });

    return response.data.records
      .map((record) => {
        const uriParts = record.uri.split("/");
        const rkey = uriParts[uriParts.length - 1];
        return {
          uri: record.uri,
          cid: record.cid,
          rkey,
          value: record.value as ActivityRecord,
        };
      })
      .sort((a, b) => {
        const aDate = a.value.createdAt ?? "";
        const bDate = b.value.createdAt ?? "";
        return bDate.localeCompare(aDate);
      });
  } catch (err) {
    console.error("listActivities failed:", err);
    throw err;
  }
}

export async function getActivity(
  agent: Agent,
  did: string,
  rkey: string,
): Promise<ActivityRecord | null> {
  try {
    const response = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: ACTIVITY_COLLECTION,
      rkey,
    });

    return response.data.value as ActivityRecord;
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

export async function createActivity(
  agent: Agent,
  did: string,
  record: Omit<ActivityRecord, "$type" | "createdAt">,
): Promise<{ uri: string; cid: string }> {
  const rkey = generateTid();
  const createdAt = new Date().toISOString();

  const response = await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: ACTIVITY_COLLECTION,
    rkey,
    record: {
      $type: ACTIVITY_COLLECTION,
      ...record,
      createdAt,
    },
  });

  return {
    uri: response.data.uri,
    cid: response.data.cid,
  };
}

export async function deleteActivity(
  agent: Agent,
  did: string,
  rkey: string,
): Promise<void> {
  await agent.com.atproto.repo.deleteRecord({
    repo: did,
    collection: ACTIVITY_COLLECTION,
    rkey,
  });
}
