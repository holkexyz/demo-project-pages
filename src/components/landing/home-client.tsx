"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useNavbarVariant } from "@/lib/navbar-context";
import { useProjects } from "@/hooks/use-projects";
import ProjectGallery from "@/components/projects/project-gallery";
import { Tags, Sparkles, Search } from "lucide-react";

const FEATURE_CARDS = [
  {
    icon: Tags,
    title: "Tag Manager",
    description: "Create and manage your work scope taxonomy",
    buttonLabel: "Manage Tags",
    href: "/tags",
  },
  {
    icon: Sparkles,
    title: "Activity Creator",
    description: "Describe work and let AI suggest tags",
    buttonLabel: "Create Activity",
    href: "/activities/new",
  },
  {
    icon: Search,
    title: "Explorer",
    description: "Build rules, match activities, analyze data",
    buttonLabel: "Open Explorer",
    href: "/explorer",
  },
];

const QUICK_START_STEPS = [
  { label: "Seed your tag taxonomy", href: "/tags" },
  { label: "Create an activity with AI-suggested tags", href: "/activities/new" },
  { label: "Explore and match with CEL rules", href: "/explorer" },
];

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
          {/* Hero section */}
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-bold text-[var(--color-navy)] mb-3">
              Hypercert Work Scope Intelligence
            </h1>
            <p className="text-[var(--color-dark-gray)] text-lg max-w-2xl mx-auto">
              ATProto-native ontology, AI-assisted tagging, and executable work scopes
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            {FEATURE_CARDS.map(({ icon: Icon, title, description, buttonLabel, href }) => (
              <div
                key={href}
                className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--color-navy)]/10 rounded-lg">
                    <Icon className="w-6 h-6 text-[var(--color-navy)]" />
                  </div>
                  <h2 className="font-semibold text-[var(--color-navy)] text-lg">{title}</h2>
                </div>
                <p className="text-[var(--color-dark-gray)] text-sm flex-1">{description}</p>
                <Link
                  href={href}
                  className="inline-block text-center font-mono text-xs uppercase tracking-wider px-4 py-2 rounded border border-[var(--color-navy)] text-[var(--color-navy)] hover:bg-[var(--color-navy)] hover:text-white transition-colors duration-150"
                >
                  {buttonLabel}
                </Link>
              </div>
            ))}
          </div>

          {/* Quick Start */}
          <div className="mb-12 bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h2 className="font-semibold text-[var(--color-navy)] text-lg mb-4">Quick Start</h2>
            <ol className="flex flex-col gap-3">
              {QUICK_START_STEPS.map(({ label, href }, index) => (
                <li key={href} className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--color-navy)] text-white text-sm font-bold flex items-center justify-center">
                    {index + 1}
                  </span>
                  <Link
                    href={href}
                    className="text-[var(--color-navy)] hover:underline underline-offset-4 text-sm"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ol>
          </div>

          {/* Projects section */}
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
          Demo App.<br />For Ken.
        </h1>
        <p className="hero__subtitle hero-reveal">
          Leaflet project descriptions all the way.
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
