"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/lib/auth/auth-context"
import { getProfile, getAvatarUrl, getBannerUrl } from "@/lib/atproto/profile"
import type { CertifiedProfile } from "@/lib/atproto/types"

export function useProfile(): {
  profile: CertifiedProfile | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  avatarUrl: string | null
  bannerUrl: string | null
} {
  const { agent, did, pdsUrl } = useAuth()
  const [profile, setProfile] = useState<CertifiedProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Stable ref so refetch() always calls the latest version
  const cancelledRef = useRef(false)

  const fetchProfile = useCallback(async () => {
    // If not authenticated, return null profile without error
    if (!agent || !did) {
      setProfile(null)
      setIsLoading(false)
      setError(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const fetchedProfile = await getProfile(agent, did)
      if (cancelledRef.current) return
      setProfile(fetchedProfile)
    } catch (err) {
      if (cancelledRef.current) return
      console.error("Failed to fetch profile:", err)
      setError(err instanceof Error ? err.message : "Failed to fetch profile")
    } finally {
      if (!cancelledRef.current) {
        setIsLoading(false)
      }
    }
  }, [agent, did])

  // Fetch profile on mount and when agent/did/pdsUrl change
  useEffect(() => {
    cancelledRef.current = false
    fetchProfile()
    return () => {
      cancelledRef.current = true
    }
  }, [fetchProfile])

  // Compute avatar and banner URLs
  const effectivePdsUrl = pdsUrl || process.env.NEXT_PUBLIC_PDS_URL || "https://epds1.test.certified.app/"
  const avatarUrl = profile && did ? getAvatarUrl(profile, did, effectivePdsUrl) : null
  const bannerUrl = profile && did ? getBannerUrl(profile, did, effectivePdsUrl) : null

  return {
    profile,
    isLoading,
    error,
    refetch: fetchProfile,
    avatarUrl,
    bannerUrl,
  }
}
