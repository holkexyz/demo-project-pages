"use client";

import { useState, useEffect, useCallback } from "react";
import { Agent } from "@atproto/api";
import { listProjects } from "@/lib/atproto/projects";
import type { ProjectListItem } from "@/lib/atproto/project-types";

export function useProjects(
  agent: Agent | null,
  did: string | null,
): {
  projects: ProjectListItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setFetchTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!agent || !did) {
      setProjects([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchProjects = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await listProjects(agent, did);
        if (!cancelled) {
          setProjects(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load projects",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchProjects();

    return () => {
      cancelled = true;
    };
  }, [agent, did, fetchTrigger]);

  return { projects, isLoading, error, refetch };
}
