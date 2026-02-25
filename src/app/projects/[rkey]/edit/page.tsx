"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import type { BlobRef } from "@atproto/api";
import AuthGuard from "@/components/layout/auth-guard";
import { ProjectForm } from "@/components/projects/project-form";
import { useAuth } from "@/lib/auth/auth-context";
import {
  getProject,
  updateProject,
  uploadProjectImage,
  getProjectImageUrl,
} from "@/lib/atproto/projects";
import type {
  LeafletLinearDocument,
  ProjectListItem,
} from "@/lib/atproto/project-types";
import LoadingSpinner from "@/components/ui/loading-spinner";
import ErrorMessage from "@/components/ui/error-message";

function EditProjectContent() {
  const router = useRouter();
  const params = useParams();
  const rkey = params.rkey as string;

  const { agent, did, pdsUrl } = useAuth();

  const [project, setProject] = useState<ProjectListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!agent || !did || !rkey) return;

    let cancelled = false;

    const fetchProject = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const result = await getProject(agent, did, rkey);
        if (cancelled) return;
        if (!result) {
          setLoadError("Project not found");
        } else {
          setProject(result);
        }
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          err instanceof Error ? err.message : "Failed to load project"
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchProject();
    return () => {
      cancelled = true;
    };
  }, [agent, did, rkey]);

  const handleImageUpload = async (
    file: File
  ): Promise<{ blobRef: BlobRef; url: string }> => {
    if (!agent) throw new Error("Not authenticated");
    const blobRef = await uploadProjectImage(agent, file);
    const url = URL.createObjectURL(file);
    return { blobRef, url };
  };

  const handleSave = async (data: {
    title: string;
    shortDescription: string;
    description: LeafletLinearDocument;
    banner?: BlobRef;
  }) => {
    if (!agent || !did || !project) throw new Error("Not authenticated");

    setIsSaving(true);
    try {
      // Determine banner: use new upload if provided, otherwise keep existing
      let bannerField:
        | { $type: "org.hypercerts.defs#largeImage"; image: BlobRef }
        | { $type: "org.hypercerts.defs#uri"; uri: string }
        | undefined = undefined;

      if (data.banner) {
        bannerField = {
          $type: "org.hypercerts.defs#largeImage",
          image: data.banner,
        };
      } else if (project.value.banner) {
        bannerField = project.value.banner as unknown as typeof bannerField;
      }

      await updateProject(agent, did, rkey, {
        type: "project",
        title: data.title,
        shortDescription: data.shortDescription || undefined,
        description: data.description,
        banner: bannerField,
        items: project.value.items ?? [],
        createdAt: project.value.createdAt,
      });

      router.push(`/projects/${rkey}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (loadError || !project) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <ErrorMessage
          title="Project not found"
          message={loadError ?? "This project could not be loaded."}
          onRetry={() => {
            if (agent && did) {
              setIsLoading(true);
              setLoadError(null);
              getProject(agent, did, rkey)
                .then((result) => {
                  if (!result) {
                    setLoadError("Project not found");
                  } else {
                    setProject(result);
                  }
                })
                .catch((err) => {
                  setLoadError(
                    err instanceof Error ? err.message : "Failed to load project"
                  );
                })
                .finally(() => setIsLoading(false));
            }
          }}
        />
      </div>
    );
  }

  // Resolve existing banner URL for preview
  const existingBannerUrl =
    project.value.banner &&
    project.value.banner.$type === "org.hypercerts.defs#largeImage" &&
    pdsUrl &&
    did
      ? getProjectImageUrl(
          pdsUrl,
          did,
          (project.value.banner as { $type: "org.hypercerts.defs#largeImage"; image: BlobRef }).image.ref.$link
        )
      : project.value.banner &&
        project.value.banner.$type === "org.hypercerts.defs#uri"
      ? (project.value.banner as { $type: "org.hypercerts.defs#uri"; uri: string }).uri
      : null;

  return (
    <ProjectForm
      mode="edit"
      initialData={{
        title: project.value.title,
        shortDescription: project.value.shortDescription,
        description: project.value.description,
        bannerUrl: existingBannerUrl,
      }}
      onSave={handleSave}
      isSaving={isSaving}
      onImageUpload={handleImageUpload}
    />
  );
}

export default function EditProjectPage() {
  return (
    <AuthGuard>
      <EditProjectContent />
    </AuthGuard>
  );
}
