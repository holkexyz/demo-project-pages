"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { listActivities } from "@/lib/atproto/activities";
import type { ActivityListItem } from "@/lib/atproto/activity-types";

export function useActivities(): {
  activities: ActivityListItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
} {
  const { agent, did } = useAuth();
  const [activities, setActivities] = useState<ActivityListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setFetchTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!agent || !did) {
      setActivities([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchActivities = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await listActivities(agent, did);
        if (!cancelled) {
          setActivities(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load activities",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchActivities();

    return () => {
      cancelled = true;
    };
  }, [agent, did, fetchTrigger]);

  return { activities, isLoading, error, refetch };
}
