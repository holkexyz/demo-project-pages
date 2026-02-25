"use client";

import React from "react";
import { Plus } from "lucide-react";
import Button from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/loading-spinner";
import ErrorMessage from "@/components/ui/error-message";
import ProjectCard from "./project-card";
import type { ProjectListItem } from "@/lib/atproto/project-types";

export interface ProjectGalleryProps {
  projects: ProjectListItem[];
  isLoading: boolean;
  error: string | null;
  pdsUrl: string;
  did: string;
  onProjectClick: (rkey: string) => void;
  onCreateProject: () => void;
  onRetry?: () => void;
}

const ProjectGallery: React.FC<ProjectGalleryProps> = ({
  projects,
  isLoading,
  error,
  pdsUrl,
  did,
  onProjectClick,
  onCreateProject,
  onRetry,
}) => {
  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-h3 font-mono text-navy">My Projects</h2>
        <Button variant="primary" size="md" onClick={onCreateProject}>
          <Plus className="w-4 h-4" />
          Create Project
        </Button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="md" />
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <ErrorMessage
          message={error}
          onRetry={() => {
            // Trigger a page reload to retry — consumers can override via key prop
            window.location.reload();
          }}
        />
      )}

      {/* Empty state */}
      {!isLoading && !error && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-body text-gray-400">No projects yet</p>
          <Button variant="secondary" size="md" onClick={onCreateProject}>
            Create your first project
          </Button>
        </div>
      )}

      {/* Project grid */}
      {!isLoading && !error && projects.length > 0 && (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          style={{ gap: "1.5rem" }}
        >
          {projects.map((project) => (
            <ProjectCard
              key={project.uri}
              project={project}
              pdsUrl={pdsUrl}
              did={did}
              onClick={() => onProjectClick(project.rkey)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectGallery;
