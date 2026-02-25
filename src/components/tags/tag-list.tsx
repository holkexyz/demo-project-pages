"use client";

import React, { useState, useMemo } from "react";
import { Trash2 } from "lucide-react";
import type {
  WorkScopeTagListItem,
  WorkScopeTagKind,
} from "@/lib/atproto/work-scope-types";
import { WORK_SCOPE_TAG_KINDS } from "@/lib/atproto/work-scope-types";

const KIND_COLORS: Record<
  WorkScopeTagKind,
  { pill: string; heading: string }
> = {
  ecosystem: {
    pill: "bg-emerald-100 text-emerald-800 border-emerald-300",
    heading: "text-emerald-700",
  },
  method: {
    pill: "bg-blue-100 text-blue-800 border-blue-300",
    heading: "text-blue-700",
  },
  data: {
    pill: "bg-purple-100 text-purple-800 border-purple-300",
    heading: "text-purple-700",
  },
  governance: {
    pill: "bg-amber-100 text-amber-800 border-amber-300",
    heading: "text-amber-700",
  },
  outcomes: {
    pill: "bg-rose-100 text-rose-800 border-rose-300",
    heading: "text-rose-700",
  },
};

export interface TagListProps {
  tags: WorkScopeTagListItem[];
  onDelete?: (rkey: string) => void;
  isLoading: boolean;
}

const TagList: React.FC<TagListProps> = ({ tags, onDelete, isLoading }) => {
  const [search, setSearch] = useState("");
  const [activeKind, setActiveKind] = useState<WorkScopeTagKind | "all">("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tags.filter((t) => {
      const matchesSearch =
        !q ||
        t.value.key.toLowerCase().includes(q) ||
        t.value.label.toLowerCase().includes(q) ||
        (t.value.description ?? "").toLowerCase().includes(q);
      const matchesKind = activeKind === "all" || t.value.kind === activeKind;
      return matchesSearch && matchesKind;
    });
  }, [tags, search, activeKind]);

  const grouped = useMemo(() => {
    const groups: Record<WorkScopeTagKind, WorkScopeTagListItem[]> = {
      ecosystem: [],
      method: [],
      data: [],
      governance: [],
      outcomes: [],
    };
    for (const tag of filtered) {
      groups[tag.value.kind].push(tag);
    }
    return groups;
  }, [filtered]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded bg-gray-200 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="text"
        placeholder="Search tags by key, label, or description…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full h-10 border border-[rgba(15,37,68,0.15)] rounded bg-white px-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-accent focus:ring-1 focus:ring-accent/20 focus:outline-none transition-all duration-150"
      />

      {/* Kind filter */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveKind("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors duration-150 ${
            activeKind === "all"
              ? "bg-navy text-white border-navy"
              : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
          }`}
        >
          All
        </button>
        {WORK_SCOPE_TAG_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => setActiveKind(kind)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors duration-150 ${
              activeKind === kind
                ? KIND_COLORS[kind].pill + " font-semibold"
                : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
            }`}
          >
            {kind.charAt(0).toUpperCase() + kind.slice(1)}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="py-12 text-center text-gray-400 text-sm">
          No tags found
        </div>
      )}

      {/* Grouped tags */}
      {WORK_SCOPE_TAG_KINDS.map((kind) => {
        const kindTags = grouped[kind];
        if (kindTags.length === 0) return null;
        return (
          <div key={kind}>
            <h3
              className={`text-xs font-mono font-semibold uppercase tracking-wider mb-2 ${KIND_COLORS[kind].heading}`}
            >
              {kind}
            </h3>
            <div className="space-y-2">
              {kindTags.map((tag) => (
                <div
                  key={tag.uri}
                  className="flex items-start justify-between gap-3 bg-white border border-[rgba(15,37,68,0.1)] rounded p-3 hover:border-[rgba(15,37,68,0.18)] transition-colors duration-150"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-800">
                        {tag.value.label}
                      </span>
                      <code className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        {tag.value.key}
                      </code>
                      {tag.value.status && tag.value.status !== "active" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                          {tag.value.status}
                        </span>
                      )}
                    </div>
                    {tag.value.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {tag.value.description}
                      </p>
                    )}
                  </div>
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => onDelete(tag.rkey)}
                      className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 transition-colors duration-150 rounded"
                      aria-label={`Delete ${tag.value.label}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TagList;
