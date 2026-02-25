export const ACTIVITY_COLLECTION = "org.hypercerts.claim.activity";

export interface ActivityRecord {
  $type?: string;
  title: string;
  description: string;   // plain text description
  workScope: {
    expression: string;  // CEL expression, e.g. scope.hasAll(["mangrove_restoration","open_data"])
    tagKeys: string[];   // the tag keys referenced in the expression
    labels: string[];    // same as tagKeys, used for indexing/prefiltering
  };
  createdAt: string;     // ISO 8601
}

export interface ActivityListItem {
  uri: string;
  cid: string;
  rkey: string;
  value: ActivityRecord;
}
