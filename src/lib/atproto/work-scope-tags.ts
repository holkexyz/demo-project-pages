import { Agent } from "@atproto/api";
import {
  WORK_SCOPE_TAG_COLLECTION,
  type WorkScopeTagRecord,
  type WorkScopeTagListItem,
} from "./work-scope-types";

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

export async function listWorkScopeTags(
  agent: Agent,
  did: string,
): Promise<WorkScopeTagListItem[]> {
  const response = await agent.com.atproto.repo.listRecords({
    repo: did,
    collection: WORK_SCOPE_TAG_COLLECTION,
    limit: 100,
  });

  const items: WorkScopeTagListItem[] = response.data.records.map((record) => {
    const uriParts = record.uri.split("/");
    const rkey = uriParts[uriParts.length - 1];
    return {
      uri: record.uri,
      cid: record.cid,
      rkey,
      value: record.value as WorkScopeTagRecord,
    };
  });

  return items.sort((a, b) => {
    const kindCmp = a.value.kind.localeCompare(b.value.kind);
    if (kindCmp !== 0) return kindCmp;
    return a.value.label.localeCompare(b.value.label);
  });
}

export async function getWorkScopeTag(
  agent: Agent,
  did: string,
  rkey: string,
): Promise<WorkScopeTagRecord | null> {
  try {
    const response = await agent.com.atproto.repo.getRecord({
      repo: did,
      collection: WORK_SCOPE_TAG_COLLECTION,
      rkey,
    });

    return response.data.value as WorkScopeTagRecord;
  } catch (err) {
    // Return null for genuine "record not found" errors
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

export async function createWorkScopeTag(
  agent: Agent,
  did: string,
  record: Omit<WorkScopeTagRecord, "$type" | "createdAt">,
): Promise<{ uri: string; cid: string }> {
  const rkey = generateTid();
  const fullRecord: WorkScopeTagRecord = {
    ...record,
    $type: WORK_SCOPE_TAG_COLLECTION,
    createdAt: new Date().toISOString(),
    status: record.status ?? "active",
  };

  const response = await agent.com.atproto.repo.createRecord({
    repo: did,
    collection: WORK_SCOPE_TAG_COLLECTION,
    rkey,
    record: fullRecord,
  });

  return {
    uri: response.data.uri,
    cid: response.data.cid,
  };
}

export async function deleteWorkScopeTag(
  agent: Agent,
  did: string,
  rkey: string,
): Promise<void> {
  await agent.com.atproto.repo.deleteRecord({
    repo: did,
    collection: WORK_SCOPE_TAG_COLLECTION,
    rkey,
  });
}

type SeedTag = Omit<WorkScopeTagRecord, "$type" | "createdAt" | "status">;

const SEED_TAGS: SeedTag[] = [
  // ecosystem (6)
  {
    key: "mangrove_restoration",
    label: "Mangrove Restoration",
    kind: "ecosystem",
    description: "Restoring mangrove forests to protect coastlines and sequester carbon.",
  },
  {
    key: "wetland_restoration",
    label: "Wetland Restoration",
    kind: "ecosystem",
    description: "Rehabilitating wetland ecosystems to support biodiversity and water filtration.",
  },
  {
    key: "coral_reef_protection",
    label: "Coral Reef Protection",
    kind: "ecosystem",
    description: "Protecting and restoring coral reef ecosystems threatened by climate change.",
  },
  {
    key: "forest_regeneration",
    label: "Forest Regeneration",
    kind: "ecosystem",
    description: "Supporting natural forest regeneration to rebuild woodland ecosystems.",
  },
  {
    key: "grassland_restoration",
    label: "Grassland Restoration",
    kind: "ecosystem",
    description: "Restoring native grasslands to support soil health and wildlife habitat.",
  },
  {
    key: "urban_greening",
    label: "Urban Greening",
    kind: "ecosystem",
    description: "Introducing green infrastructure into urban environments to improve biodiversity.",
  },
  // method (5)
  {
    key: "remote_sensing",
    label: "Remote Sensing",
    kind: "method",
    description: "Using satellite and aerial imagery to monitor ecosystem change at scale.",
  },
  {
    key: "community_engagement",
    label: "Community Engagement",
    kind: "method",
    description: "Involving local communities in planning and implementing restoration activities.",
  },
  {
    key: "indigenous_knowledge",
    label: "Indigenous Knowledge",
    kind: "method",
    description: "Integrating traditional ecological knowledge into nature regeneration practices.",
  },
  {
    key: "scientific_monitoring",
    label: "Scientific Monitoring",
    kind: "method",
    description: "Applying rigorous scientific methods to track ecosystem health and recovery.",
  },
  {
    key: "agroforestry",
    label: "Agroforestry",
    kind: "method",
    description: "Combining trees with crops or livestock to restore land while supporting livelihoods.",
  },
  // data (4)
  {
    key: "open_data",
    label: "Open Data",
    kind: "data",
    description: "Making environmental datasets publicly available to accelerate research and accountability.",
  },
  {
    key: "biodiversity_monitoring",
    label: "Biodiversity Monitoring",
    kind: "data",
    description: "Systematically tracking species presence and abundance to measure ecosystem recovery.",
  },
  {
    key: "carbon_measurement",
    label: "Carbon Measurement",
    kind: "data",
    description: "Quantifying carbon stocks and fluxes to verify sequestration outcomes.",
  },
  {
    key: "water_quality_tracking",
    label: "Water Quality Tracking",
    kind: "data",
    description: "Monitoring water quality indicators to assess ecosystem health and restoration progress.",
  },
  // governance (3)
  {
    key: "community_led",
    label: "Community Led",
    kind: "governance",
    description: "Governance structures where local communities hold decision-making authority.",
  },
  {
    key: "multi_stakeholder",
    label: "Multi Stakeholder",
    kind: "governance",
    description: "Inclusive governance models that bring together diverse actors for collective decisions.",
  },
  {
    key: "transparent_reporting",
    label: "Transparent Reporting",
    kind: "governance",
    description: "Publicly disclosing project activities, outcomes, and finances to build trust.",
  },
  // outcomes (3)
  {
    key: "carbon_sequestration",
    label: "Carbon Sequestration",
    kind: "outcomes",
    description: "Capturing and storing atmospheric carbon dioxide through ecosystem restoration.",
  },
  {
    key: "biodiversity_increase",
    label: "Biodiversity Increase",
    kind: "outcomes",
    description: "Measurable growth in species richness and abundance as a result of restoration.",
  },
  {
    key: "livelihood_improvement",
    label: "Livelihood Improvement",
    kind: "outcomes",
    description: "Enhancing the economic and social wellbeing of communities through nature-based work.",
  },
];

export async function seedWorkScopeTags(
  agent: Agent,
  did: string,
): Promise<void> {
  const existing = await listWorkScopeTags(agent, did);
  if (existing.length > 5) {
    return;
  }

  for (const tag of SEED_TAGS) {
    await createWorkScopeTag(agent, did, tag);
  }
}
