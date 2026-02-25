"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { listWorkScopeTags } from "@/lib/atproto/work-scope-tags";
import type { WorkScopeTagListItem } from "@/lib/atproto/work-scope-types";

export function useWorkScopeTags(): {
  tags: WorkScopeTagListItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const { agent, did } = useAuth();
  const [tags, setTags] = useState<WorkScopeTagListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setFetchTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!agent || !did) {
      setTags([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchTags = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await listWorkScopeTags(agent, did);
        if (!cancelled) {
          setTags(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load work scope tags",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchTags();

    return () => {
      cancelled = true;
    };
  }, [agent, did, fetchTrigger]);

  return { tags, isLoading, error, refetch };
}
