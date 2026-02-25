"use client";

import React, { useState } from "react";
import { HelpCircle } from "lucide-react";
import type { ActivityListItem } from "@/lib/atproto/activity-types";
import type { WorkScopeTagListItem } from "@/lib/atproto/work-scope-types";
import { evaluateCel } from "@/lib/cel/cel-engine";
import { TagChip } from "@/components/tags/tag-chip";
import { ExplainPanel } from "./explain-panel";

export interface ActivityResultsProps {
  activities: ActivityListItem[];
  expression: string;
  availableTags: WorkScopeTagListItem[];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function ActivityResults({
  activities,
  expression,
  availableTags,
}: ActivityResultsProps) {
  const [selectedActivity, setSelectedActivity] =
    useState<ActivityListItem | null>(null);

  const tagMap = new Map(availableTags.map((t) => [t.value.key, t]));

  // Evaluate each activity
  const evaluated = activities.map((activity) => {
    const tagKeys = activity.value.workScope?.tagKeys ?? [];
    const matches = expression
      ? evaluateCel(expression, { scope: { tags: tagKeys } })
      : true;
    return { activity, matches };
  });

  // Sort: matching first, then non-matching
  const sorted = [
    ...evaluated.filter((e) => e.matches),
    ...evaluated.filter((e) => !e.matches),
  ];

  const matchCount = evaluated.filter((e) => e.matches).length;
  const total = activities.length;

  return (
    <>
      <div className="bg-white border border-[rgba(15,37,68,0.1)] rounded-lg p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-navy)]">
            Activities
          </h2>
          {expression ? (
            <span className="text-sm font-mono text-[var(--color-mid-gray)]">
              <span className="font-semibold text-[var(--color-navy)]">
                {matchCount}
              </span>{" "}
              of {total} match
            </span>
          ) : (
            <span className="text-sm text-[var(--color-mid-gray)] italic">
              Enter a rule to filter activities
            </span>
          )}
        </div>

        {activities.length === 0 ? (
          <p className="text-sm text-[var(--color-mid-gray)] italic">
            No activities yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map(({ activity, matches }) => {
              const tagKeys = activity.value.workScope?.tagKeys ?? [];
              const resolvedTags = tagKeys
                .map((k) => tagMap.get(k))
                .filter((t): t is WorkScopeTagListItem => t !== undefined);

              return (
                <div
                  key={activity.uri}
                  className={`border rounded-lg p-4 transition-opacity duration-150 cursor-pointer ${
                    expression && !matches
                      ? "opacity-40 border-[var(--color-light-gray)]"
                      : "border-[rgba(15,37,68,0.12)] hover:border-[rgba(15,37,68,0.22)]"
                  }`}
                  onClick={() => setSelectedActivity(activity)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedActivity(activity);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-[var(--color-navy)] text-sm leading-snug">
                      {activity.value.title}
                    </h3>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {expression && !matches && (
                        <span className="text-[10px] font-mono uppercase tracking-wider text-red-500 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                          Does not match
                        </span>
                      )}
                      {expression && matches && (
                        <span className="text-[10px] font-mono uppercase tracking-wider text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                          Matches
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedActivity(activity);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[var(--color-mid-gray)] bg-[var(--color-off-white)] border border-[rgba(15,37,68,0.12)] rounded px-1.5 py-0.5 hover:border-[rgba(15,37,68,0.25)] hover:text-[var(--color-navy)] transition-colors duration-150"
                        aria-label="Explain why this activity matches or doesn't match"
                      >
                        <HelpCircle className="w-3 h-3" />
                        Why?
                      </button>
                    </div>
                  </div>

                  {activity.value.description && (
                    <p className="text-sm text-[var(--color-dark-gray)] line-clamp-2 mb-2">
                      {activity.value.description}
                    </p>
                  )}

                  {resolvedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {resolvedTags.map((tag) => (
                        <TagChip key={tag.value.key} tag={tag} size="sm" />
                      ))}
                    </div>
                  )}

                  {activity.value.workScope?.expression && (
                    <div className="font-mono text-[11px] text-[var(--color-mid-gray)] break-all bg-[var(--color-off-white)] rounded px-2 py-1 mb-2">
                      {activity.value.workScope.expression}
                    </div>
                  )}

                  <div className="text-[11px] text-[var(--color-mid-gray)] font-mono">
                    {formatDate(activity.value.createdAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Explain Panel */}
      {selectedActivity && (
        <ExplainPanel
          activity={selectedActivity}
          expression={expression}
          availableTags={availableTags}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </>
  );
}

export default ActivityResults;
