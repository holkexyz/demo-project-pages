"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import AuthGuard from "@/components/layout/auth-guard";
import { useAuth } from "@/lib/auth/auth-context";
import { useWorkScopeTags } from "@/hooks/use-work-scope-tags";
import { useActivities } from "@/hooks/use-activities";
import { RuleBuilder } from "./rule-builder";
import { ActivityResults } from "./activity-results";
import { CollectionsPanel } from "./collections-panel";
import { AnalyticsPanel } from "./analytics-panel";

function ExplorerContent() {
  const { did } = useAuth();
  const { tags, isLoading: tagsLoading } = useWorkScopeTags();
  const { activities, isLoading: activitiesLoading } = useActivities();
  const [expression, setExpression] = useState("");
  const [analyticsOpen, setAnalyticsOpen] = useState(true);

  const isLoading = tagsLoading || activitiesLoading;

  if (!did) return null;

  return (
    <div className="app-page">
      <div className="app-page__inner" style={{ maxWidth: "1440px" }}>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-navy)]">
            Work Scope Explorer
          </h1>
          <p className="text-sm text-[var(--color-mid-gray)] mt-1">
            Build CEL rules to filter and explore activities by work scope.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-sm font-mono text-[var(--color-mid-gray)]">
              Loading…
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="bg-white border border-[rgba(15,37,68,0.1)] rounded-lg p-12 text-center">
            <p className="text-[var(--color-mid-gray)] mb-4">
              No activities yet. Create some activities first.
            </p>
            <Link
              href="/activities/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[#4e93d8] transition-colors duration-150"
            >
              Create Activity
            </Link>
          </div>
        ) : (
          <>
            {/* Rule builder + results + collections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <RuleBuilder
                availableTags={tags}
                expression={expression}
                onExpressionChange={setExpression}
              />
              <ActivityResults
                activities={activities}
                expression={expression}
                availableTags={tags}
              />
              <CollectionsPanel
                activities={activities}
                availableTags={tags}
                activeExpression={expression}
                onSelectCollection={setExpression}
              />
            </div>

            {/* Analytics section */}
            <div className="mt-8">
              <button
                type="button"
                onClick={() => setAnalyticsOpen((prev) => !prev)}
                className="flex items-center gap-2 w-full text-left mb-4 group"
              >
                {analyticsOpen ? (
                  <ChevronDown className="w-5 h-5 text-[var(--color-mid-gray)] group-hover:text-[var(--color-navy)] transition-colors" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-[var(--color-mid-gray)] group-hover:text-[var(--color-navy)] transition-colors" />
                )}
                <h2 className="text-xl font-semibold text-[var(--color-navy)] group-hover:text-[var(--color-accent)] transition-colors">
                  Analytics
                </h2>
              </button>
              {analyticsOpen && (
                <AnalyticsPanel activities={activities} availableTags={tags} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function ExplorerPage() {
  return (
    <AuthGuard>
      <ExplorerContent />
    </AuthGuard>
  );
}

export default ExplorerPage;
