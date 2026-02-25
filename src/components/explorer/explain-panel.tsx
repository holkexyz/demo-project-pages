"use client";

import React from "react";
import { X, CheckCircle, XCircle } from "lucide-react";
import type { ActivityListItem } from "@/lib/atproto/activity-types";
import type { WorkScopeTagListItem } from "@/lib/atproto/work-scope-types";
import { evaluateCelWithDetails } from "@/lib/cel/cel-engine";

export interface ExplainPanelProps {
  activity: ActivityListItem;
  expression: string;
  availableTags: WorkScopeTagListItem[];
  onClose: () => void;
}

export function ExplainPanel({
  activity,
  expression,
  availableTags,
  onClose,
}: ExplainPanelProps) {
  const tagMap = new Map(availableTags.map((t) => [t.value.key, t]));
  const tagKeys = activity.value.workScope?.tagKeys ?? [];

  const result = evaluateCelWithDetails(expression, {
    scope: { tags: tagKeys },
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-[rgba(15,37,68,0.1)]">
          <div className="min-w-0">
            <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-mid-gray)] mb-0.5">
              Explainability
            </p>
            <h2 className="text-base font-semibold text-[var(--color-navy)] leading-snug">
              {activity.value.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded hover:bg-[var(--color-off-white)] transition-colors duration-150 text-[var(--color-mid-gray)] hover:text-[var(--color-navy)]"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
          {/* Section 1: Activity Work Scope */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-mid-gray)] mb-3">
              Activity Work Scope
            </h3>

            {activity.value.workScope?.expression ? (
              <div className="font-mono text-[12px] text-[var(--color-navy)] bg-[var(--color-off-white)] border border-[rgba(15,37,68,0.08)] rounded px-3 py-2 mb-3 break-all">
                {activity.value.workScope.expression}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-mid-gray)] italic mb-3">
                No CEL expression on this activity.
              </p>
            )}

            {tagKeys.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {tagKeys.map((key) => {
                  const tag = tagMap.get(key);
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center text-xs px-2 py-0.5 rounded-full border bg-[var(--color-off-white)] border-[rgba(15,37,68,0.15)] text-[var(--color-navy)] font-mono"
                    >
                      {tag ? tag.value.label : key}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[var(--color-mid-gray)] italic">
                No tags on this activity.
              </p>
            )}
          </section>

          {/* Section 2: Rule Evaluation */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-mid-gray)] mb-3">
              Rule Evaluation
            </h3>

            {!expression ? (
              <p className="text-sm text-[var(--color-mid-gray)] italic">
                No rule expression set. Enter a rule in the builder to see
                evaluation details.
              </p>
            ) : (
              <>
                {/* Sub-expression breakdown */}
                {result.details.length > 0 ? (
                  <div className="flex flex-col gap-2 mb-4">
                    {result.details.map((detail, idx) => (
                      <div
                        key={idx}
                        className={`rounded-lg border p-3 ${
                          detail.result
                            ? "border-green-200 bg-green-50"
                            : "border-red-200 bg-red-50"
                        }`}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          {detail.result ? (
                            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          )}
                          <span className="font-mono text-[11px] text-[var(--color-navy)] break-all leading-relaxed">
                            {detail.subExpression}
                          </span>
                        </div>

                        {/* Matched tags */}
                        {detail.matchedTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 ml-6">
                            {detail.matchedTags.map((key) => {
                              const tag = tagMap.get(key);
                              return (
                                <span
                                  key={key}
                                  className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border bg-green-100 border-green-300 text-green-800 font-mono"
                                >
                                  {tag ? tag.value.label : key}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Missing tags */}
                        {detail.missingTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 ml-6 mt-1">
                            {detail.missingTags.map((key) => {
                              const tag = tagMap.get(key);
                              return (
                                <span
                                  key={key}
                                  className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full border bg-red-100 border-red-300 text-red-700 font-mono line-through"
                                >
                                  {tag ? tag.value.label : key}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--color-mid-gray)] italic mb-4">
                    Could not parse sub-expressions.
                  </p>
                )}

                {/* Overall verdict */}
                <div
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 border ${
                    result.matches
                      ? "bg-green-50 border-green-300"
                      : "bg-red-50 border-red-300"
                  }`}
                >
                  {result.matches ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  )}
                  <span
                    className={`font-mono font-bold text-sm tracking-wider uppercase ${
                      result.matches ? "text-green-700" : "text-red-600"
                    }`}
                  >
                    {result.matches ? "MATCHES" : "DOES NOT MATCH"}
                  </span>
                </div>
              </>
            )}
          </section>

          {/* Section 3: Tag Details */}
          {tagKeys.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-mid-gray)] mb-3">
                Tag Details
              </h3>
              <div className="flex flex-col gap-2">
                {tagKeys.map((key) => {
                  const tag = tagMap.get(key);
                  if (!tag) {
                    return (
                      <div
                        key={key}
                        className="rounded border border-[rgba(15,37,68,0.08)] bg-[var(--color-off-white)] px-3 py-2"
                      >
                        <span className="font-mono text-xs text-[var(--color-mid-gray)]">
                          {key}
                        </span>
                        <span className="ml-2 text-xs text-[var(--color-mid-gray)] italic">
                          (not found in tag list)
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={key}
                      className="rounded border border-[rgba(15,37,68,0.08)] bg-[var(--color-off-white)] px-3 py-2"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-sm text-[var(--color-navy)]">
                          {tag.value.label}
                        </span>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--color-mid-gray)] bg-white border border-[rgba(15,37,68,0.12)] rounded-full px-1.5 py-0.5">
                          {tag.value.kind}
                        </span>
                      </div>
                      {tag.value.description && (
                        <p className="text-xs text-[var(--color-dark-gray)] leading-relaxed">
                          {tag.value.description}
                        </p>
                      )}
                      <p className="font-mono text-[10px] text-[var(--color-mid-gray)] mt-1">
                        {tag.value.key}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

export default ExplainPanel;
