"use client";

import React from "react";
import type { WorkScopeTagListItem } from "@/lib/atproto/work-scope-types";
import { WORK_SCOPE_TAG_KINDS } from "@/lib/atproto/work-scope-types";
import type { ExpressionMode } from "@/lib/cel/expression-builder";
import { TagChip } from "@/components/tags/tag-chip";

export interface TagSuggestionPanelProps {
  availableTags: WorkScopeTagListItem[];
  selectedTagKeys: string[];
  onSelectionChange: (keys: string[]) => void;
  tagModes: Record<string, ExpressionMode>;
  onModeChange: (key: string, mode: ExpressionMode) => void;
  suggestions: { key: string; confidence: number; reason: string }[] | null;
  isLoadingSuggestions: boolean;
}

const MODE_LABELS: { mode: ExpressionMode; label: string }[] = [
  { mode: "must_have_all", label: "MUST" },
  { mode: "any_of", label: "ANY" },
  { mode: "exclude", label: "EXCLUDE" },
];

export function TagSuggestionPanel({
  availableTags,
  selectedTagKeys,
  onSelectionChange,
  tagModes,
  onModeChange,
  suggestions,
  isLoadingSuggestions,
}: TagSuggestionPanelProps) {
  const suggestionMap = React.useMemo(() => {
    if (!suggestions) return new Map<string, { confidence: number; reason: string }>();
    return new Map(suggestions.map((s) => [s.key, s]));
  }, [suggestions]);

  const handleToggle = (key: string) => {
    if (selectedTagKeys.includes(key)) {
      onSelectionChange(selectedTagKeys.filter((k) => k !== key));
    } else {
      onSelectionChange([...selectedTagKeys, key]);
    }
  };

  // Group tags by kind
  const tagsByKind = React.useMemo(() => {
    const map = new Map<string, WorkScopeTagListItem[]>();
    for (const kind of WORK_SCOPE_TAG_KINDS) {
      map.set(kind, []);
    }
    for (const tag of availableTags) {
      const kind = tag.value.kind;
      if (!map.has(kind)) map.set(kind, []);
      map.get(kind)!.push(tag);
    }
    return map;
  }, [availableTags]);

  const selectedTags = availableTags.filter((t) =>
    selectedTagKeys.includes(t.value.key)
  );

  return (
    <div className="flex flex-col gap-4">
      {/* AI suggestion loading skeleton */}
      {isLoadingSuggestions && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg animate-pulse">
          <div className="w-4 h-4 rounded-full bg-blue-200 flex-shrink-0" />
          <span className="text-sm text-blue-500 font-mono">
            AI is analyzing your description...
          </span>
        </div>
      )}

      {/* Suggestion info banner */}
      {suggestions !== null && !isLoadingSuggestions && suggestions.length > 0 && (
        <div className="text-xs text-[var(--color-mid-gray)] font-mono bg-[var(--color-off-white)] border border-[var(--color-light-gray)] rounded px-3 py-2">
          AI suggested {suggestions.length} tag{suggestions.length !== 1 ? "s" : ""} — hover chips to see reasons
        </div>
      )}

      {/* Tag count */}
      <div className="text-xs font-mono text-[var(--color-mid-gray)] uppercase tracking-wider">
        {selectedTagKeys.length} tag{selectedTagKeys.length !== 1 ? "s" : ""} selected
      </div>

      {/* Tags grouped by kind */}
      <div className="flex flex-col gap-4">
        {WORK_SCOPE_TAG_KINDS.map((kind) => {
          const tags = tagsByKind.get(kind) ?? [];
          if (tags.length === 0) return null;
          return (
            <div key={kind}>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-mid-gray)] mb-2">
                {kind}
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const isSelected = selectedTagKeys.includes(tag.value.key);
                  const suggestion = suggestionMap.get(tag.value.key);
                  const confidencePct = suggestion
                    ? Math.round(suggestion.confidence * 100)
                    : null;

                  return (
                    <div
                      key={tag.value.key}
                      className="relative group inline-flex flex-col items-start"
                    >
                      <div className="inline-flex items-center gap-1">
                        <TagChip
                          tag={tag}
                          selected={isSelected}
                          onClick={() => handleToggle(tag.value.key)}
                        />
                        {confidencePct !== null && (
                          <span className="text-[10px] font-mono text-[var(--color-mid-gray)]">
                            {confidencePct}%
                          </span>
                        )}
                      </div>
                      {/* Tooltip for suggestion reason */}
                      {suggestion && (
                        <div className="absolute bottom-full left-0 mb-1 z-10 hidden group-hover:block w-48 bg-[var(--color-navy)] text-white text-xs rounded px-2 py-1.5 shadow-lg pointer-events-none">
                          {suggestion.reason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mode toggles for selected tags */}
      {selectedTags.length > 0 && (
        <div className="border-t border-[var(--color-light-gray)] pt-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-mid-gray)] mb-3">
            Expression mode per tag
          </div>
          <div className="flex flex-col gap-2">
            {selectedTags.map((tag) => {
              const currentMode = tagModes[tag.value.key] ?? "must_have_all";
              return (
                <div key={tag.value.key} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[var(--color-dark-gray)] min-w-[120px] truncate">
                    {tag.value.label}
                  </span>
                  <div className="flex gap-1">
                    {MODE_LABELS.map(({ mode, label }) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onModeChange(tag.value.key, mode)}
                        className={`text-xs border rounded px-2 py-0.5 font-mono transition-colors duration-150 ${
                          currentMode === mode
                            ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                            : "bg-transparent text-[var(--color-mid-gray)] border-[var(--color-light-gray)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default TagSuggestionPanel;
