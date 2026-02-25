"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useNavbarVariant } from "@/lib/navbar-context";
import { useProjects } from "@/hooks/use-projects";
import ProjectGallery from "@/components/projects/project-gallery";

export default function HomeClient() {
  const { isLoading, session, did, agent, pdsUrl, openSignUp } = useAuth();
  const { projects, isLoading: projectsLoading, error: projectsError, refetch: refetchProjects } = useProjects(agent, did);
  const { setVariant } = useNavbarVariant();
  const router = useRouter();

  useEffect(() => {
    if (!session && !isLoading) {
      setVariant("transparent");
    }
    return () => {
      setVariant("default");
    };
  }, [session, isLoading, setVariant]);

  useEffect(() => {
    if (!isLoading && !session) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isLoading, session]);

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
      <div className="app-page">
        <div className="app-page__inner">
          {did ? (
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
          ) : null}
        </div>
      </div>
    );
  }

  // Not authenticated - Landing page
  return (
    <section className="hero">
      <div className="hero__bg" aria-hidden="true" />
      <div className="hero__inner">
        <h1 className="hero__title hero-reveal">
          One account.<br />Any app.
        </h1>
        <p className="hero__subtitle hero-reveal">
          Your identity and data \u2014 everywhere you go.
        </p>
        <div className="hero-reveal">
          <div className="hero__actions">
            <button className="hero__btn-primary" onClick={openSignUp}>
              Create your Certified ID
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7.5 4.5L13 10m0 0l-5.5 5.5M13 10H3" />
              </svg>
            </button>
            <Link href="/terms" className="hero__btn-secondary">
              Learn more
            </Link>
          </div>
        </div>
      </div>
      <footer className="hero__footer">
        <div className="hero__footer-inner">
          <p>&copy; 2026 Certified. All rights reserved.</p>
          <div className="hero__footer-links">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Policy</Link>
          </div>
        </div>
      </footer>
    </section>
  );
}
