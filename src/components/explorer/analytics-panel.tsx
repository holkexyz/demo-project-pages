"use client";

import React, { useMemo } from "react";
import type { ActivityListItem } from "@/lib/atproto/activity-types";
import type { WorkScopeTagListItem } from "@/lib/atproto/work-scope-types";
import { WORK_SCOPE_TAG_KINDS } from "@/lib/atproto/work-scope-types";
import { evaluateCel } from "@/lib/cel/cel-engine";

export interface AnalyticsPanelProps {
  activities: ActivityListItem[];
  availableTags: WorkScopeTagListItem[];
}

// Kind colors matching TagChip
const KIND_BAR_COLORS: Record<string, string> = {
  ecosystem: "bg-emerald-400",
  method: "bg-blue-400",
  data: "bg-purple-400",
  governance: "bg-amber-400",
  outcomes: "bg-rose-400",
};

const KIND_CARD_COLORS: Record<string, string> = {
  ecosystem: "bg-emerald-50 border-emerald-200 text-emerald-800",
  method: "bg-blue-50 border-blue-200 text-blue-800",
  data: "bg-purple-50 border-purple-200 text-purple-800",
  governance: "bg-amber-50 border-amber-200 text-amber-800",
  outcomes: "bg-rose-50 border-rose-200 text-rose-800",
};

const QUICK_QUERIES = [
  {
    label: "Remote sensing AND monitoring",
    expression: `scope.hasAll(["remote_sensing","biodiversity_monitoring"])`,
  },
  {
    label: "Community-led",
    expression: `scope.has("community_led")`,
  },
  {
    label: "Open data",
    expression: `scope.has("open_data")`,
  },
  {
    label: "Carbon + biodiversity",
    expression: `scope.hasAll(["carbon_sequestration","biodiversity_increase"])`,
  },
];

export function AnalyticsPanel({ activities, availableTags }: AnalyticsPanelProps) {
  const total = activities.length;

  // Build tag map for label/kind lookup
  const tagMap = useMemo(
    () => new Map(availableTags.map((t) => [t.value.key, t])),
    [availableTags]
  );

  // 1. Tag frequency: count how many activities use each tag key
  const tagFrequency = useMemo(() => {
    const counts = new Map<string, number>();
    for (const activity of activities) {
      const tagKeys = activity.value.workScope?.tagKeys ?? [];
      for (const key of tagKeys) {
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    // Sort by count descending
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, count, tag: tagMap.get(key) }));
  }, [activities, tagMap]);

  // 2. Kind distribution: count activities per kind
  const kindDistribution = useMemo(() => {
    return WORK_SCOPE_TAG_KINDS.map((kind) => {
      const kindTagKeys = new Set(
        availableTags.filter((t) => t.value.kind === kind).map((t) => t.value.key)
      );
      const count = activities.filter((activity) => {
        const tagKeys = activity.value.workScope?.tagKeys ?? [];
        return tagKeys.some((k) => kindTagKeys.has(k));
      }).length;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return { kind, count, pct };
    });
  }, [activities, availableTags, total]);

  // 3. Quick queries: pre-computed counts
  const quickQueryResults = useMemo(() => {
    return QUICK_QUERIES.map(({ label, expression }) => {
      const count = activities.filter((activity) => {
        const tagKeys = activity.value.workScope?.tagKeys ?? [];
        return evaluateCel(expression, { scope: { tags: tagKeys } });
      }).length;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return { label, count, pct };
    });
  }, [activities, total]);

  if (total === 0) {
    return (
      <div className="bg-white border border-[rgba(15,37,68,0.1)] rounded-lg p-8 text-center">
        <p className="text-sm text-[var(--color-mid-gray)] italic">
          No activities to analyze
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Tag Frequency */}
      <div className="bg-white border border-[rgba(15,37,68,0.1)] rounded-lg p-6">
        <h3 className="text-base font-semibold text-[var(--color-navy)] mb-4">
          Tag Frequency
        </h3>
        {tagFrequency.length === 0 ? (
          <p className="text-sm text-[var(--color-mid-gray)] italic">
            No tags used in activities.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {tagFrequency.map(({ key, count, tag }) => {
              const kind = tag?.value.kind ?? "ecosystem";
              const label = tag?.value.label ?? key;
              const barColor = KIND_BAR_COLORS[kind] ?? KIND_BAR_COLORS.ecosystem;
              const widthPct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="w-36 text-xs text-[var(--color-dark-gray)] truncate flex-shrink-0">
                    {label}
                  </div>
                  <div className="flex-1 bg-[var(--color-off-white)] rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-4 rounded-full ${barColor} transition-all duration-300`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <div className="w-6 text-xs font-mono text-[var(--color-mid-gray)] text-right flex-shrink-0">
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Kind Distribution */}
      <div className="bg-white border border-[rgba(15,37,68,0.1)] rounded-lg p-6">
        <h3 className="text-base font-semibold text-[var(--color-navy)] mb-4">
          Kind Distribution
        </h3>
        <div className="grid grid-cols-5 gap-3">
          {kindDistribution.map(({ kind, count, pct }) => {
            const cardColor = KIND_CARD_COLORS[kind] ?? KIND_CARD_COLORS.ecosystem;
            return (
              <div
                key={kind}
                className={`border rounded-lg p-3 flex flex-col items-center gap-1 ${cardColor}`}
              >
                <div className="text-[10px] font-mono uppercase tracking-widest opacity-70 text-center leading-tight">
                  {kind}
                </div>
                <div className="text-2xl font-bold leading-none">{count}</div>
                <div className="text-[11px] font-mono opacity-70">{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Quick Queries */}
      <div className="bg-white border border-[rgba(15,37,68,0.1)] rounded-lg p-6">
        <h3 className="text-base font-semibold text-[var(--color-navy)] mb-4">
          Quick Queries
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-light-gray)]">
              <th className="text-left text-[10px] font-mono uppercase tracking-widest text-[var(--color-mid-gray)] pb-2 pr-4">
                Query
              </th>
              <th className="text-right text-[10px] font-mono uppercase tracking-widest text-[var(--color-mid-gray)] pb-2 pr-4 w-16">
                Count
              </th>
              <th className="text-right text-[10px] font-mono uppercase tracking-widest text-[var(--color-mid-gray)] pb-2 w-16">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {quickQueryResults.map(({ label, count, pct }) => (
              <tr
                key={label}
                className="border-b border-[var(--color-off-white)] last:border-0"
              >
                <td className="py-2 pr-4 text-[var(--color-dark-gray)]">{label}</td>
                <td className="py-2 pr-4 text-right font-mono font-semibold text-[var(--color-navy)]">
                  {count}
                </td>
                <td className="py-2 text-right font-mono text-[var(--color-mid-gray)]">
                  {pct}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AnalyticsPanel;
