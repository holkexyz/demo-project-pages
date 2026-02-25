"use client";

import React from "react";
import { Trash2 } from "lucide-react";
import Card from "@/components/ui/card";
import TagChip from "@/components/tags/tag-chip";
import type { ActivityListItem } from "@/lib/atproto/activity-types";
import type { WorkScopeTagListItem } from "@/lib/atproto/work-scope-types";

export interface ActivityCardProps {
  activity: ActivityListItem;
  availableTags: WorkScopeTagListItem[];
  onDelete?: (rkey: string) => void;
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

const ActivityCard: React.FC<ActivityCardProps> = ({
  activity,
  availableTags,
  onDelete,
}) => {
  const { value, rkey } = activity;

  const handleDelete = () => {
    if (!onDelete) return;
    if (window.confirm(`Delete activity "${value.title}"?`)) {
      onDelete(rkey);
    }
  };

  return (
    <Card className="relative flex flex-col gap-3">
      {/* Delete button */}
      {onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-red-500 transition-colors duration-150 rounded"
          aria-label={`Delete ${value.title}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {/* Title */}
      <h3 className="font-mono text-base font-semibold text-navy pr-8 leading-snug">
        {value.title}
      </h3>

      {/* Description */}
      {value.description && (
        <p className="text-sm text-gray-600 line-clamp-3">
          {value.description}
        </p>
      )}

      {/* Tag chips */}
      {value.workScope?.tagKeys && value.workScope.tagKeys.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.workScope.tagKeys.map((key) => {
            const found = availableTags.find((t) => t.value.key === key);
            if (found) {
              return <TagChip key={key} tag={found} size="sm" />;
            }
            // Fallback: gray chip with just the key
            return (
              <span
                key={key}
                className="inline-flex items-center text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-300"
              >
                {key}
              </span>
            );
          })}
        </div>
      )}

      {/* CEL expression */}
      {value.workScope?.expression && (
        <pre className="text-xs font-mono bg-gray-50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all text-gray-700">
          {value.workScope.expression}
        </pre>
      )}

      {/* Created date */}
      {value.createdAt && (
        <p className="text-xs text-gray-400 mt-auto">
          {formatDate(value.createdAt)}
        </p>
      )}
    </Card>
  );
};

export default ActivityCard;
