"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BlobRef } from "@atproto/api";
import AuthGuard from "@/components/layout/auth-guard";
import { ProjectForm } from "@/components/projects/project-form";
import { useAuth } from "@/lib/auth/auth-context";
import {
  createProject,
  uploadProjectImage,
} from "@/lib/atproto/projects";
import type { LeafletLinearDocument } from "@/lib/atproto/project-types";

function CreateProjectContent() {
  const router = useRouter();
  const { agent, did } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const handleImageUpload = async (
    file: File
  ): Promise<{ blobRef: BlobRef; url: string }> => {
    if (!agent) throw new Error("Not authenticated");
    const blobRef = await uploadProjectImage(agent, file);
    // Construct a temporary object URL for preview
    const url = URL.createObjectURL(file);
    return { blobRef, url };
  };

  const handleSave = async (data: {
    title: string;
    shortDescription: string;
    description: LeafletLinearDocument;
    banner?: BlobRef;
  }) => {
    if (!agent || !did) throw new Error("Not authenticated");

    setIsSaving(true);
    try {
      const bannerField = data.banner
        ? { $type: "org.hypercerts.defs#largeImage" as const, image: data.banner }
        : undefined;

      const result = await createProject(agent, did, {
        type: "project",
        title: data.title,
        shortDescription: data.shortDescription || undefined,
        description: data.description,
        banner: bannerField,
        items: [],
        createdAt: new Date().toISOString(),
      });

      router.push(`/projects/${result.rkey}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ProjectForm
      mode="create"
      onSave={handleSave}
      isSaving={isSaving}
      onImageUpload={handleImageUpload}
    />
  );
}

export default function CreateProjectPage() {
  return (
    <AuthGuard>
      <div className="pt-[56px]">
        <CreateProjectContent />
      </div>
    </AuthGuard>
  );
}
