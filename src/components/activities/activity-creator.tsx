"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useWorkScopeTags } from "@/hooks/use-work-scope-tags";
import { createActivity } from "@/lib/atproto/activities";
import {
  buildCelExpression,
  type ExpressionMode,
  type TagSelection,
} from "@/lib/cel/expression-builder";
import AuthGuard from "@/components/layout/auth-guard";
import { TagSuggestionPanel } from "@/components/activities/tag-suggestion-panel";
import { CelPreview } from "@/components/activities/cel-preview";
import Button from "@/components/ui/button";

interface Suggestion {
  key: string;
  confidence: number;
  reason: string;
}

function ActivityCreatorForm() {
  const router = useRouter();
  const { agent, did } = useAuth();
  const { tags } = useWorkScopeTags();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTagKeys, setSelectedTagKeys] = useState<string[]>([]);
  const [tagModes, setTagModes] = useState<Record<string, ExpressionMode>>({});

  // AI suggestion state
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  // Publish state
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  // Compute CEL expression live
  const celExpression = useMemo(() => {
    if (selectedTagKeys.length === 0) return "";
    const selections: TagSelection[] = selectedTagKeys.map((key) => ({
      key,
      mode: tagModes[key] ?? "must_have_all",
    }));
    return buildCelExpression(selections);
  }, [selectedTagKeys, tagModes]);

  const handleModeChange = useCallback(
    (key: string, mode: ExpressionMode) => {
      setTagModes((prev) => ({ ...prev, [key]: mode }));
    },
    []
  );

  const handleSuggest = useCallback(async () => {
    if (!title.trim() || !description.trim()) return;

    setIsLoadingSuggestions(true);
    setSuggestError(null);

    try {
      const availableTags = tags.map((t) => ({
        key: t.value.key,
        label: t.value.label,
        kind: t.value.kind,
        description: t.value.description,
      }));

      const res = await fetch("/api/suggest-work-scopes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, availableTags }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed: ${res.status}`);
      }

      const data = await res.json();
      const suggestedTags: Suggestion[] = data.suggestedTags ?? [];
      setSuggestions(suggestedTags);

      // Pre-select tags with confidence >= 0.5
      const highConfidenceKeys = suggestedTags
        .filter((s) => s.confidence >= 0.5)
        .map((s) => s.key);

      setSelectedTagKeys((prev) => {
        const combined = new Set([...prev, ...highConfidenceKeys]);
        return Array.from(combined);
      });
    } catch (err) {
      setSuggestError(
        err instanceof Error ? err.message : "Failed to get suggestions"
      );
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [title, description, tags]);

  const handlePublish = useCallback(async () => {
    if (!agent || !did) return;
    if (!title.trim() || !description.trim() || selectedTagKeys.length === 0) return;

    setIsPublishing(true);
    setPublishError(null);

    try {
      await createActivity(agent, did, {
        title: title.trim(),
        description: description.trim(),
        workScope: {
          expression: celExpression,
          tagKeys: selectedTagKeys,
          labels: selectedTagKeys,
        },
      });

      router.push("/activities");
    } catch (err) {
      setPublishError(
        err instanceof Error ? err.message : "Failed to publish activity"
      );
    } finally {
      setIsPublishing(false);
    }
  }, [agent, did, title, description, selectedTagKeys, celExpression, router]);

  const canSuggest = title.trim().length > 0 && description.trim().length > 0;
  const canPublish =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    selectedTagKeys.length > 0;

  return (
    <div className="app-page">
      <div className="app-page__inner">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          {/* Page heading */}
          <div>
            <h1 className="text-2xl font-mono font-bold text-[var(--color-navy)] uppercase tracking-tight">
              New Activity
            </h1>
            <p className="text-sm text-[var(--color-mid-gray)] mt-1">
              Describe your work and let AI suggest the right work scope tags.
            </p>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="activity-title"
              className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-mid-gray)]"
            >
              Title <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              id="activity-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mangrove restoration survey Q1 2026"
              className="w-full border border-[var(--color-light-gray)] rounded-lg px-4 py-2.5 text-sm font-mono text-[var(--color-navy)] bg-white placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-colors duration-150"
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="activity-description"
              className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-mid-gray)]"
            >
              Description <span className="text-[var(--color-error)]">*</span>
            </label>
            <textarea
              id="activity-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the work being done..."
              rows={6}
              className="w-full border border-[var(--color-light-gray)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-dark-gray)] bg-white placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 transition-colors duration-150 resize-none"
            />
          </div>

          {/* Suggest button */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleSuggest}
              disabled={!canSuggest || isLoadingSuggestions}
              className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-mono text-sm font-semibold uppercase tracking-wider transition-all duration-150 ${
                canSuggest && !isLoadingSuggestions
                  ? "bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-deep-blue)] text-white shadow-md hover:opacity-90 cursor-pointer"
                  : "bg-[var(--color-light-gray)] text-[var(--color-mid-gray)] cursor-not-allowed opacity-60"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              {isLoadingSuggestions ? "Analyzing..." : "Suggest Work Scopes"}
            </button>
            {suggestError && (
              <p className="text-xs text-[var(--color-error)] font-mono">
                {suggestError}
              </p>
            )}
          </div>

          {/* Tag suggestion panel */}
          {tags.length > 0 && (
            <div className="app-card">
              <TagSuggestionPanel
                availableTags={tags}
                selectedTagKeys={selectedTagKeys}
                onSelectionChange={setSelectedTagKeys}
                tagModes={tagModes}
                onModeChange={handleModeChange}
                suggestions={suggestions}
                isLoadingSuggestions={isLoadingSuggestions}
              />
            </div>
          )}

          {/* CEL preview */}
          <div className="app-card">
            <CelPreview expression={celExpression} tagKeys={selectedTagKeys} />
          </div>

          {/* Publish */}
          <div className="flex flex-col gap-2">
            {publishError && (
              <p className="text-sm text-[var(--color-error)] bg-red-50 border border-red-200 rounded px-4 py-3 font-mono">
                {publishError}
              </p>
            )}
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="md"
                onClick={handlePublish}
                disabled={!canPublish || isPublishing}
                loading={isPublishing}
                type="button"
              >
                Publish Activity
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ActivityCreator() {
  return (
    <AuthGuard>
      <ActivityCreatorForm />
    </AuthGuard>
  );
}

export default ActivityCreator;
