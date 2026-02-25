"use client";

import React from "react";
import Card from "@/components/ui/card";
import type { ProjectListItem } from "@/lib/atproto/project-types";
import { getProjectImageUrl } from "@/lib/atproto/projects";

export interface ProjectCardProps {
  project: ProjectListItem;
  pdsUrl: string;
  did: string;
  onClick: () => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  pdsUrl,
  did,
  onClick,
}) => {
  const { value } = project;

  // Resolve banner image URL
  let bannerUrl: string | null = null;
  if (value.banner) {
    if (value.banner.$type === "org.hypercerts.defs#uri") {
      bannerUrl = value.banner.uri;
    } else if (value.banner.$type === "org.hypercerts.defs#largeImage") {
      // BlobRef has a .ref.$link (CID) we can use
      const blobRef = value.banner.image;
      const cid =
        typeof blobRef === "object" && blobRef !== null && "ref" in blobRef
          ? (blobRef as { ref: { $link: string } }).ref.$link
          : null;
      if (cid) {
        bannerUrl = getProjectImageUrl(pdsUrl, did, cid);
      }
    }
  }

  return (
    <Card hoverable className="cursor-pointer p-0 overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
        aria-label={value.title}
        className="flex flex-col h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        {/* Banner / thumbnail */}
        <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
          {bannerUrl ? (
            <img
              src={bannerUrl}
              alt={value.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background:
                  "linear-gradient(135deg, #0F2544 0%, #60A1E2 100%)",
              }}
            />
          )}
        </div>

        {/* Card body */}
        <div className="p-4 flex flex-col gap-1 flex-1">
          {/* Title */}
          <h3
            className="font-mono text-h4 text-navy truncate"
            title={value.title}
          >
            {value.title}
          </h3>

          {/* Short description */}
          {value.shortDescription && (
            <p className="text-body-sm text-gray-400 line-clamp-2">
              {value.shortDescription}
            </p>
          )}

          {/* Date */}
          <p className="text-caption text-gray-400 mt-auto pt-2">
            {formatDate(value.createdAt)}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default ProjectCard;
