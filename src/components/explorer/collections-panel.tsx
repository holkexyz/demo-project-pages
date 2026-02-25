"use client";

import React from "react";
import type { ActivityListItem } from "@/lib/atproto/activity-types";
import type { WorkScopeTagListItem } from "@/lib/atproto/work-scope-types";
import { evaluateCel } from "@/lib/cel/cel-engine";

export interface CollectionsPanelProps {
  activities: ActivityListItem[];
  availableTags: WorkScopeTagListItem[];
  onSelectCollection: (expression: string) => void;
  activeExpression: string;
}

interface DemoCollection {
  name: string;
  description: string;
  expression: string;
  accentColor: string;
}

const DEMO_COLLECTIONS: DemoCollection[] = [
  {
    name: "Nature-Based Solutions",
    description: "Activities involving ecosystem restoration",
    expression:
      'scope.hasAny(["mangrove_restoration","wetland_restoration","coral_reef_protection","forest_regeneration","grassland_restoration"])',
    accentColor: "#22c55e", // green-500
  },
  {
    name: "Monitoring-Heavy Projects",
    description: "Activities with strong monitoring components",
    expression:
      'scope.hasAny(["biodiversity_monitoring","remote_sensing","scientific_monitoring","carbon_measurement"])',
    accentColor: "#3b82f6", // blue-500
  },
  {
    name: "Community-Led Restoration",
    description: "Community-driven with governance",
    expression:
      'scope.hasAny(["community_led","community_engagement","indigenous_knowledge"]) && scope.hasAny(["multi_stakeholder","transparent_reporting"])',
    accentColor: "#f59e0b", // amber-500
  },
  {
    name: "Open Data Projects",
    description: "Activities publishing open data",
    expression: 'scope.has("open_data")',
    accentColor: "#8b5cf6", // violet-500
  },
];

export function CollectionsPanel({
  activities,
  onSelectCollection,
  activeExpression,
}: CollectionsPanelProps) {
  return (
    <div className="bg-white border border-[rgba(15,37,68,0.1)] rounded-lg p-6 flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-[var(--color-navy)]">
        Living Collections
      </h2>
      <p className="text-xs text-[var(--color-mid-gray)] -mt-2">
        Click a collection to apply its rule to the explorer.
      </p>

      <div className="flex flex-col gap-3">
        {DEMO_COLLECTIONS.map((collection) => {
          const matchCount = activities.filter((activity) => {
            const tagKeys = activity.value.workScope?.tagKeys ?? [];
            return evaluateCel(collection.expression, {
              scope: { tags: tagKeys },
            });
          }).length;

          const isActive = activeExpression === collection.expression;

          return (
            <button
              key={collection.name}
              type="button"
              onClick={() => onSelectCollection(collection.expression)}
              className={`text-left rounded-lg border transition-all duration-150 overflow-hidden ${
                isActive
                  ? "border-[var(--color-accent)] bg-[rgba(96,161,226,0.06)] shadow-sm"
                  : "border-[rgba(15,37,68,0.1)] hover:border-[rgba(15,37,68,0.22)] hover:bg-[var(--color-off-white)]"
              }`}
            >
              <div className="flex">
                {/* Colored left border accent */}
                <div
                  className="w-1 flex-shrink-0 rounded-l-lg"
                  style={{ backgroundColor: collection.accentColor }}
                />
                <div className="flex-1 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-semibold leading-snug ${
                          isActive
                            ? "text-[var(--color-accent)]"
                            : "text-[var(--color-navy)]"
                        }`}
                      >
                        {collection.name}
                      </div>
                      <div className="text-xs text-[var(--color-mid-gray)] mt-0.5">
                        {collection.description}
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <span
                        className="text-lg font-bold leading-none"
                        style={{ color: collection.accentColor }}
                      >
                        {matchCount}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--color-mid-gray)] leading-none">
                        {matchCount === 1 ? "match" : "matches"}
                      </span>
                    </div>
                  </div>
                  {isActive && (
                    <div className="mt-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-accent)] bg-[rgba(96,161,226,0.12)] border border-[rgba(96,161,226,0.3)] rounded px-1.5 py-0.5">
                        Active
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default CollectionsPanel;
