export const WORK_SCOPE_TAG_COLLECTION = "org.hypercerts.helper.workScopeTag";

export interface WorkScopeTagRecord {
  $type?: string;
  key: string;           // machine-readable slug, e.g. "mangrove_restoration"
  label: string;         // human-readable, e.g. "Mangrove Restoration"
  kind: "ecosystem" | "method" | "data" | "governance" | "outcomes";
  description: string;
  parent?: string;       // key of parent tag (for taxonomy)
  status?: "active" | "deprecated";
  supersededBy?: string; // key of replacement tag
  createdAt: string;     // ISO 8601
}

export interface WorkScopeTagListItem {
  uri: string;
  cid: string;
  rkey: string;
  value: WorkScopeTagRecord;
}

export type WorkScopeTagKind = WorkScopeTagRecord["kind"];

export const WORK_SCOPE_TAG_KINDS: WorkScopeTagKind[] = [
  "ecosystem",
  "method",
  "data",
  "governance",
  "outcomes",
];
