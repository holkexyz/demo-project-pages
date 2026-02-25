"use client";

import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useActivities } from "@/hooks/use-activities";
import { useWorkScopeTags } from "@/hooks/use-work-scope-tags";
import { deleteActivity } from "@/lib/atproto/activities";
import AuthGuard from "@/components/layout/auth-guard";
import ActivityCard from "./activity-card";

const SkeletonCard: React.FC = () => (
  <div className="bg-white border border-[rgba(15,37,68,0.1)] rounded p-6 flex flex-col gap-3 animate-pulse">
    <div className="h-5 bg-gray-200 rounded w-3/4" />
    <div className="h-4 bg-gray-200 rounded w-full" />
    <div className="h-4 bg-gray-200 rounded w-5/6" />
    <div className="flex gap-2 mt-1">
      <div className="h-5 bg-gray-200 rounded-full w-20" />
      <div className="h-5 bg-gray-200 rounded-full w-16" />
    </div>
    <div className="h-10 bg-gray-100 rounded mt-1" />
    <div className="h-3 bg-gray-200 rounded w-24 mt-auto" />
  </div>
);

const ActivityListPageInner: React.FC = () => {
  const { agent, did } = useAuth();
  const { activities, isLoading, refetch } = useActivities();
  const { tags } = useWorkScopeTags();

  const handleDelete = async (rkey: string) => {
    if (!agent || !did) return;
    try {
      await deleteActivity(agent, did, rkey);
      refetch();
    } catch (err) {
      console.error("Failed to delete activity:", err);
    }
  };

  return (
    <div className="app-page">
      <div className="app-page__inner">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-h3 font-mono text-navy">Activities</h1>
          <Link
            href="/activities/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-mono text-accent bg-accent/10 border border-accent/20 rounded hover:bg-accent/15 hover:border-accent/35 transition-colors duration-150"
          >
            <Plus className="w-4 h-4" />
            New Activity
          </Link>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && activities.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-gray-500 text-sm">No activities yet.</p>
            <Link
              href="/activities/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-mono text-white bg-accent border border-accent rounded hover:bg-accent/90 transition-colors duration-150"
            >
              <Plus className="w-4 h-4" />
              Create your first activity
            </Link>
          </div>
        )}

        {/* Activity grid */}
        {!isLoading && activities.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activities.map((activity) => (
              <ActivityCard
                key={activity.uri}
                activity={activity}
                availableTags={tags}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ActivityListPage: React.FC = () => (
  <AuthGuard>
    <ActivityListPageInner />
  </AuthGuard>
);

export default ActivityListPage;
