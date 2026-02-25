"use client";

import React from "react";
import AuthGuard from "@/components/layout/auth-guard";
import { useProfile } from "@/hooks/use-profile";
import ProfileView from "@/components/profile/profile-view";
import { useAuth } from "@/lib/auth/auth-context";

const ProfilePage: React.FC = () => {
  const { did } = useAuth();
  const { profile, avatarUrl, bannerUrl } = useProfile();

  return (
    <AuthGuard>
      <div className="pt-[56px]">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <ProfileView
            profile={profile}
            did={did || ""}
            avatarUrl={avatarUrl}
            bannerUrl={bannerUrl}
          />
        </div>
      </div>
    </AuthGuard>
  );
};

export default ProfilePage;
