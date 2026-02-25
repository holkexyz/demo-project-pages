"use client";

import React, { useState } from "react";
import { Pencil, Share2, Trash2 } from "lucide-react";
import type { ProjectRecord } from "@/lib/atproto/project-types";
import { getProjectImageUrl } from "@/lib/atproto/projects";
import LeafletRenderer from "@/lib/editor/leaflet-renderer";
import Button from "@/components/ui/button";

export interface ProjectViewProps {
  project: ProjectRecord;
  rkey: string;
  pdsUrl: string;
  did: string;
  isOwner: boolean;
  onEdit?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
}

const ProjectView: React.FC<ProjectViewProps> = ({
  project,
  pdsUrl,
  did,
  isOwner,
  onEdit,
  onShare,
  onDelete,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Resolve banner URL
  let bannerUrl: string | null = null;
  if (project.banner) {
    if (project.banner.$type === "org.hypercerts.defs#uri") {
      bannerUrl = project.banner.uri;
    } else if (project.banner.$type === "org.hypercerts.defs#largeImage") {
      // BlobRef from @atproto/api has ref.$link
      const blobRef = project.banner.image as unknown as {
        ref?: { $link?: string };
        cid?: string;
      };
      const cid = blobRef?.ref?.$link ?? blobRef?.cid ?? "";
      if (cid) {
        bannerUrl = getProjectImageUrl(pdsUrl, did, cid);
      }
    }
  }

  // Format created date
  const createdDate = project.createdAt
    ? new Date(project.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Banner */}
      <div
        className="w-full rounded overflow-hidden"
        style={{ aspectRatio: "3 / 1" }}
      >
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt={`${project.title} banner`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-navy via-deep to-accent/40" />
        )}
      </div>

      {/* Title */}
      <h1 className="text-h1 font-mono text-navy mt-6 mb-4">
        {project.title}
      </h1>

      {/* Meta row */}
      <div className="flex items-center gap-4 mb-4">
        {createdDate && (
          <span className="text-caption text-gray-400 uppercase tracking-wider">
            {createdDate}
          </span>
        )}
        <span
          className="text-caption text-gray-400 font-mono truncate max-w-xs"
          title={did}
        >
          {did}
        </span>
      </div>

      {/* Short description */}
      {project.shortDescription && (
        <p className="text-body text-gray-700 italic mb-6">
          {project.shortDescription}
        </p>
      )}

      {/* Action buttons (owner only) */}
      {isOwner && (
        <div className="flex items-center gap-3 mb-8">
          {onEdit && (
            <Button variant="secondary" size="sm" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
          )}
          {onShare && (
            <Button variant="secondary" size="sm" onClick={onShare}>
              <Share2 className="w-3.5 h-3.5" />
              Share
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteClick}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
          )}
        </div>
      )}

      {/* Description (Leaflet rich text) */}
      {project.description && (
        <div className="mb-8">
          <LeafletRenderer
            document={project.description}
            pdsUrl={pdsUrl}
            did={did}
          />
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-navy/50 backdrop-blur-sm"
            onClick={handleDeleteCancel}
            aria-hidden="true"
          />
          {/* Dialog */}
          <div className="relative bg-white rounded border border-gray-200 shadow-elevation-3 w-full max-w-sm mx-4 p-6">
            <h3
              id="delete-confirm-title"
              className="font-mono text-sm font-semibold text-navy uppercase tracking-wider mb-2"
            >
              Delete project
            </h3>
            <p className="text-body-sm text-gray-700 mb-6">
              Are you sure you want to delete &ldquo;{project.title}&rdquo;? This
              action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDeleteCancel}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteConfirm}
                loading={isDeleting}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectView;
