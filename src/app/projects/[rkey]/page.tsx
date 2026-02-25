"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { getProject, deleteProject } from "@/lib/atproto/projects";
import type { ProjectListItem } from "@/lib/atproto/project-types";
import ProjectView from "@/components/projects/project-view";
import ShareModal from "@/components/projects/share-modal";
import LoadingSpinner from "@/components/ui/loading-spinner";
import ErrorMessage from "@/components/ui/error-message";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const auth = useAuth();

  const rkey = typeof params?.rkey === "string" ? params.rkey : "";

  const [project, setProject] = useState<ProjectListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    if (auth.isLoading) return;
    if (!auth.agent || !auth.did) {
      // Not authenticated — redirect to home
      router.replace("/");
      return;
    }
    if (!rkey) {
      setError("Invalid project URL.");
      setIsLoading(false);
      return;
    }

    const fetchProject = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getProject(auth.agent!, auth.did!, rkey);
        if (!result) {
          setError("Project not found.");
        } else {
          setProject(result);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load project."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [auth.isLoading, auth.agent, auth.did, rkey, router]);

  const handleEdit = () => {
    router.push(`/projects/${rkey}/edit`);
  };

  const handleShare = () => {
    setIsShareModalOpen(true);
  };

  const handleDelete = async () => {
    if (!auth.agent || !auth.did) return;
    setDeleteError(null);
    try {
      await deleteProject(auth.agent, auth.did, rkey);
      router.push("/");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete project. Please try again."
      );
    }
  };

  // Build share URL
  const shareUrl =
    typeof window !== "undefined" && auth.did
      ? `${window.location.origin}/p/${auth.did}/${rkey}`
      : "";

  if (auth.isLoading || isLoading) {
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
          onRetry={() => router.refresh()}
        />
      </div>
    );
  }

  if (!project) {
    return null;
  }

  // The project was fetched from the authenticated user's own repo, so they are always the owner
  const isOwner = !!auth.did;

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 py-8 pt-[56px]">
        <ProjectView
          project={project.value}
          rkey={rkey}
          pdsUrl={auth.pdsUrl ?? ""}
          did={auth.did ?? ""}
          isOwner={isOwner}
          onEdit={handleEdit}
          onShare={handleShare}
          onDelete={handleDelete}
          deleteError={deleteError}
        />
      </div>

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareUrl={shareUrl}
      />
    </>
  );
}
