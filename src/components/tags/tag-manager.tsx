"use client";

import React, { useState } from "react";
import { Plus, Loader2, Sprout } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useWorkScopeTags } from "@/hooks/use-work-scope-tags";
import {
  createWorkScopeTag,
  deleteWorkScopeTag,
  seedWorkScopeTags,
} from "@/lib/atproto/work-scope-tags";
import type { WorkScopeTagRecord } from "@/lib/atproto/work-scope-types";
import TagList from "./tag-list";
import TagFormModal from "./tag-form-modal";

const TagManager: React.FC = () => {
  const { agent, did, isLoading: authLoading, openSignIn } = useAuth();
  const { tags, isLoading, refetch } = useWorkScopeTags();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

  // Auth guard
  if (authLoading) {
    return (
      <div className="app-page">
        <div className="app-page__inner flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  if (!agent || !did) {
    return (
      <div className="app-page">
        <div className="app-page__inner flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-gray-500 text-sm">
            Sign in to manage work scope tags.
          </p>
          <button
            type="button"
            onClick={openSignIn}
            className="px-4 py-2 text-sm font-mono text-accent bg-accent/10 border border-accent/20 rounded hover:bg-accent/15 hover:border-accent/35 transition-colors duration-150"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const handleSeed = async () => {
    setIsSeeding(true);
    setSeedError(null);
    try {
      await seedWorkScopeTags(agent, did);
      refetch();
    } catch (err) {
      setSeedError(
        err instanceof Error ? err.message : "Failed to seed tags"
      );
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCreate = async (
    tag: Omit<WorkScopeTagRecord, "$type" | "createdAt">
  ) => {
    await createWorkScopeTag(agent, did, tag);
    refetch();
  };

  const handleDelete = async (rkey: string) => {
    try {
      await deleteWorkScopeTag(agent, did, rkey);
      refetch();
    } catch (err) {
      console.error("Failed to delete tag:", err);
    }
  };

  const existingKeys = tags.map((t) => t.value.key);

  return (
    <div className="app-page">
      <div className="app-page__inner">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-h3 font-mono text-navy">Work Scope Tags</h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSeed}
              disabled={isSeeding}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-mono text-gray-600 bg-white border border-gray-200 rounded hover:border-gray-300 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSeeding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sprout className="w-4 h-4" />
              )}
              Seed Tags
            </button>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-mono text-accent bg-accent/10 border border-accent/20 rounded hover:bg-accent/15 hover:border-accent/35 transition-colors duration-150"
            >
              <Plus className="w-4 h-4" />
              New Tag
            </button>
          </div>
        </div>

        {seedError && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {seedError}
          </div>
        )}

        <TagList tags={tags} onDelete={handleDelete} isLoading={isLoading} />

        <TagFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreate}
          existingKeys={existingKeys}
        />
      </div>
    </div>
  );
};

export default TagManager;
