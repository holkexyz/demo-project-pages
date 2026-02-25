"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Edit } from "lucide-react";
import {
  resolveDidToPds,
  getPublicProject,
  getPublicProfile,
} from "@/lib/atproto/public-api";
import { getProjectImageUrl } from "@/lib/atproto/projects";
import type { ProjectRecord } from "@/lib/atproto/project-types";
import type { CertifiedProfile } from "@/lib/atproto/types";
import ProjectView from "@/components/projects/project-view";
import LoadingSpinner from "@/components/ui/loading-spinner";
import ErrorMessage from "@/components/ui/error-message";
import Avatar from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth/auth-context";

export default function PublicProjectPage() {
  const params = useParams();
  const auth = useAuth();

  const did = typeof params?.did === "string" ? decodeURIComponent(params.did) : "";
  const rkey = typeof params?.rkey === "string" ? decodeURIComponent(params.rkey) : "";

  const [pdsUrl, setPdsUrl] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectRecord | null>(null);
  const [profile, setProfile] = useState<CertifiedProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!did || !rkey) {
      setError("Invalid project URL.");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Step 1: Resolve DID → PDS URL
        const resolvedPdsUrl = await resolveDidToPds(did);
        setPdsUrl(resolvedPdsUrl);

        // Step 2: Fetch project and profile in parallel
        const [fetchedProject, fetchedProfile] = await Promise.all([
          getPublicProject(resolvedPdsUrl, did, rkey),
          getPublicProfile(resolvedPdsUrl, did),
        ]);

        if (!fetchedProject) {
          setError("This project could not be found.");
        } else {
          setProject(fetchedProject);
          setProfile(fetchedProfile);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load project."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [did, rkey, retryCount]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <ErrorMessage
          title="Project not found"
          message={error}
          onRetry={() => setRetryCount((c) => c + 1)}
        />
      </div>
    );
  }

  if (!project || !pdsUrl) {
    return null;
  }

  // Resolve avatar URL from profile
  let avatarUrl: string | undefined;
  if (profile?.avatar) {
    if (profile.avatar.$type === "org.hypercerts.defs#uri") {
      avatarUrl = profile.avatar.uri;
    } else if (profile.avatar.$type === "org.hypercerts.defs#smallImage") {
      // The image blob ref may be in @atproto/api BlobRef format or raw JSON wire format
      const image = profile.avatar.image as unknown as {
        ref?: { $link?: string };
        cid?: string;
        toString?: () => string;
      };
      const cid =
        image?.ref?.$link ??
        image?.cid ??
        (typeof image?.toString === "function" ? image.toString() : undefined);
      if (cid) {
        avatarUrl = getProjectImageUrl(pdsUrl, did, cid);
      }
    }
  }

  const displayName = profile?.displayName ?? did;

  // Determine if the logged-in user is the owner of this project
  const isOwner = !auth.isLoading && !!auth.did && auth.did === did;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pt-[56px]">
      {/* Author header */}
      <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-200">
        <Avatar
          src={avatarUrl}
          alt={displayName}
          size="md"
          fallbackInitials={displayName.slice(0, 2)}
        />
        <div className="min-w-0">
          <p className="font-semibold text-navy text-sm leading-tight truncate">
            {displayName}
          </p>
          <p
            className="text-caption text-gray-400 font-mono truncate max-w-xs"
            title={did}
          >
            {did}
          </p>
        </div>

        {/* Subtle "Edit" link for the owner */}
        {isOwner && (
          <Link
            href={`/projects/${rkey}/edit`}
            className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 hover:text-accent transition-colors duration-150 font-mono"
          >
            <Edit className="w-3.5 h-3.5" />
            Edit
          </Link>
        )}
      </div>

      {/* Project content — no edit/share/delete buttons for non-owners */}
      <ProjectView
        project={project}
        rkey={rkey}
        pdsUrl={pdsUrl}
        did={did}
        isOwner={isOwner}
      />
    </div>
  );
}
