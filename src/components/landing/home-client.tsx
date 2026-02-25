"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useNavbarVariant } from "@/lib/navbar-context";
import { useProfile } from "@/hooks/use-profile";
import { useProjects } from "@/hooks/use-projects";
import LoadingSpinner from "@/components/ui/loading-spinner";
import ErrorMessage from "@/components/ui/error-message";
import ProfileView from "@/components/profile/profile-view";
import ProjectGallery from "@/components/projects/project-gallery";

export default function HomeClient() {
  const { isLoading, session, did, agent, pdsUrl, openSignIn, openSignUp } = useAuth();
  const { profile, isLoading: profileLoading, error: profileError, refetch: refetchProfile, avatarUrl, bannerUrl } = useProfile();
  const { projects, isLoading: projectsLoading, error: projectsError, refetch: refetchProjects } = useProjects(agent, did);
  const { setVariant } = useNavbarVariant();
  const router = useRouter();

  useEffect(() => {
    if (!session && !isLoading) {
      setVariant("transparent");
    } else if (session) {
      setVariant("default");
    }
    return () => {
      setVariant("default");
    };
  }, [session, isLoading, setVariant]);

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-screen__inner">
          <img
            src="/assets/certified_brandmark.svg"
            alt=""
            className="loading-screen__logo"
          />
        </div>
      </div>
    );
  }

  if (session) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8 pt-[56px]">
        {profileLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner size="md" />
          </div>
        ) : profileError ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <ErrorMessage message={profileError} onRetry={refetchProfile} />
          </div>
        ) : did ? (
          <>
            <ProfileView
              profile={profile}
              did={did}
              avatarUrl={avatarUrl}
              bannerUrl={bannerUrl}
            />
            <hr className="border-gray-200 my-8" />
            <ProjectGallery
              projects={projects}
              isLoading={projectsLoading}
              error={projectsError}
              pdsUrl={pdsUrl || ""}
              did={did}
              onProjectClick={(rkey) => router.push(`/projects/${rkey}`)}
              onCreateProject={() => router.push("/projects/new")}
              onRetry={refetchProjects}
            />
          </>
        ) : null}
      </div>
    );
  }

  // Not authenticated — Landing hero
  return (
    <section className="hero">
      <div className="hero__bg" aria-hidden="true" />
      <div className="hero__inner">
        <div className="hero-reveal">
          <img
            src="/assets/certified_brandmark.svg"
            alt="Certified brandmark"
            style={{ width: 80, height: 80, margin: "0 auto 32px" }}
          />
        </div>
        <h1 className="hero__title hero-reveal">
          Your Project Portfolio
        </h1>
        <p className="hero__subtitle hero-reveal">
          Create, share, and showcase your impact projects
        </p>
        <div className="hero-reveal">
          <div className="hero__actions">
            <button className="hero__btn-primary" onClick={openSignUp}>
              Get Started
            </button>
            <button className="hero__btn-secondary" onClick={openSignIn}>
              Sign In
            </button>
          </div>
        </div>
      </div>
      <footer className="hero__footer">
        <div className="hero__footer-inner">
          <p>&copy; 2026 Demo Project Pages. All rights reserved.</p>
          <div className="hero__footer-links">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
        </div>
      </footer>
    </section>
  );
}
