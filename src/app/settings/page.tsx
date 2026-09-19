"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  ArrowLeft,
  Image as ImageIcon,
  Trash2,
  Settings as SettingsIcon,
  RotateCw,
  LogOut,
  AtSign
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/supabase/user";

export default function SettingsPage() {
  const { user, loading } = useUser();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [timezone, setTimezone] = useState("");
  const [themePreference, setThemePreference] = useState("system");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showResetLayout, setShowResetLayout] = useState(false);
  const [showDisconnectAccount, setShowDisconnectAccount] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, timezone, theme_prefs")
      .eq("id", user.id)
      .single();

    if (!error && data) {
      setDisplayName(data.display_name || "");
      setAvatarUrl(data.avatar_url || "");
      setTimezone(data.timezone || "UTC");

      // Extract theme preference from theme_prefs JSON
      const themeFromPrefs = data.theme_prefs?.theme || "system";
      setThemePreference(themeFromPrefs);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsUpdating(true);
    const supabase = createClient();

    // Prepare theme preferences
    const themePrefs = { theme: themePreference };

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName || null,
        avatar_url: avatarUrl || null,
        timezone: timezone || "UTC",
        theme_prefs: themePrefs
      })
      .eq("id", user.id);

    if (!error) {
      // Show success feedback
      // In a real app, you might use a toast notification
      alert("Settings saved successfully!");
    }
    setIsUpdating(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image file too large (max 5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadAvatar = async () => {
    if (!user || !avatarPreview) return;

    setUploadingAvatar(true);
    const supabase = createClient();

    try {
      // In a real app, you would upload to Supabase Storage
      // For now, we'll simulate by storing the base64 (not recommended for production)
      // This is just for demonstration
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarPreview })
        .eq("id", user.id);

      if (!error) {
        setAvatarUrl(avatarPreview);
        setAvatarPreview(null);
        alert("Avatar uploaded successfully!");
      } else {
        throw error;
      }
    } catch (error: any) {
      alert("Failed to upload avatar: " + error.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;

    setIsUpdating(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id);

    if (!error) {
      setAvatarUrl("");
      setAvatarPreview(null);
      alert("Avatar removed successfully!");
    }
    setIsUpdating(false);
  };

  const handleResetLayout = async () => {
    if (!user) return;

    setIsUpdating(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ dashboard_layout: {} })
      .eq("id", user.id);

    if (!error) {
      // Reload the page to apply reset layout
      window.location.reload();
    } else {
      alert("Failed to reset layout: " + (error as any)?.message);
    }
    setIsUpdating(false);
    setShowResetLayout(false);
  };

  const handleDisconnectAccount = async () => {
    if (!user) return;

    // In a real app, you would sign out and potentially disconnect OAuth providers
    // For now, we'll just sign out
    const supabase = createClient();
    await supabase.auth.signOut();
    // Redirect to home page
    window.location.href = "/";
  };

  const timezones = [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Anchorage",
    "Pacific/Honolulu",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Moscow",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney",
    "Pacific/Auckland"
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="loading-spinner h-8 w-8" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-6">
        <div className="text-center space-y-4">
          <SettingsIcon size={48} className="text-muted-foreground" />
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Please sign in to access your settings
          </p>
        </div>
      </div>
    );
  }

  const avatarDisplay = avatarPreview || avatarUrl || `/images/default-avatar.png`;

  return (
    <div className="min-h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/5 dark:bg-black/5 backdrop-blur-md border-b border-white/10 dark:border-black/10">
        <button
          onClick={() => window.history.back()}
          className="flex items-center space-x-2 p-2 rounded hover:bg-white/10 dark:hover:bg-black/10"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back to Dashboard</span>
        </button>

        <h1 className="text-xl font-bold">Settings</h1>

        <div className="flex items-center space-x-2">
          <Link href="/" className="text-sm text-lime-400">
            Home
          </Link>
        </div>
      </div>

      {/* Settings Content */}
      <div className="p-6 space-y-8">
        {/* Profile Section */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Avatar */}
            <div className="space-y-4">
              <h3 className="text-md font-medium mb-2">Avatar</h3>

              <div className="relative group">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="w-24 h-24 rounded-full object-cover border-2 border-lime-400"
                  />
                ) : (
                  <img
                    src={avatarUrl || "/images/default-avatar.png"}
                    alt="Avatar"
                    className="w-24 h-24 rounded-full object-cover border-2 border-white/10 dark:border-black/10 hover:border-lime-400/50 transition-all duration-200"
                  />
                )}

                {!avatarPreview && avatarUrl && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="absolute top-0 right-0 -mt-2 -mr-2 flex h-6 w-6 items-center justify-center bg-red-400/20 text-red-400 hover:bg-red-400/30 rounded-full text-xs"
                    aria-label="Remove avatar"
                  >
                    <Trash2 size={12} />
                  </button>
                )}

                <label
                  htmlFor="avatar-upload"
                  className={`cursor-pointer w-24 h-24 rounded-full flex items-center justify-center mt-4
                    ${avatarPreview || avatarUrl
                      ? "bg-white/10 dark:bg-black/10 hover:bg-lime-400/20"
                      : "bg-lime-400/20 dark:bg-lime-400/10 hover:bg-lime-400/30"}`}
                >
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  {uploadingAvatar ? (
                    <div className="loading-spinner h-4 w-4" />
                  ) : (
                    <ImageIcon size={16} className="text-white" />
                  )}
                </label>
              </div>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-3">
                <label className="text-sm font-medium mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  className="input-enhanced"
                  autoFocus
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium mb-1">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="input-enhanced"
                >
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium mb-1">Theme Preference</label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 p-2 rounded bg-white/5 dark:bg-black/5">
                    <input
                      type="radio"
                      value="system"
                      checked={themePreference === "system"}
                      onChange={() => setThemePreference("system")}
                      className="h-4 w-4 text-lime-400"
                    />
                    <span>System</span>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded bg-white/5 dark:bg-black/5">
                    <input
                      type="radio"
                      value="light"
                      checked={themePreference === "light"}
                      onChange={() => setThemePreference("light")}
                      className="h-4 w-4 text-lime-400"
                    />
                    <span>Light</span>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded bg-white/5 dark:bg-black/5">
                    <input
                      type="radio"
                      value="dark"
                      checked={themePreference === "dark"}
                      onChange={() => setThemePreference("dark")}
                      className="h-4 w-4 text-lime-400"
                    />
                    <span>Dark</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full button-primary"
                >
                  {isUpdating ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Dashboard Section */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold mb-4">Dashboard</h2>

          <div className="space-y-4">
            <h3 className="text-md font-medium mb-2">Layout & Appearance</h3>

            <div className="space-y-3">
              <button
                onClick={() => setShowResetLayout(true)}
                className="w-full text-left flex items-center justify-between px-3 py-2 rounded-md border border-white/10 dark:border-black/10 hover:bg-white/5 dark:hover:bg-black/5"
              >
                <span>Reset Dashboard Layout</span>
                <span className="text-xs text-muted-foreground">
                  Return to default card arrangement
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Account Section */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold mb-4">Account</h2>

          <div className="space-y-4">
            <h3 className="text-md font-medium mb-2">Connected Accounts</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded bg-white/5 dark:bg-black/5">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 flex items-center justify-center bg-white/10 dark:bg-black/10 rounded-lg">
                    <User size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="font-medium">Google Account</div>
                    <div className="text-xs text-muted-foreground">
                      Connected • {user?.email || "No email"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowDisconnectAccount(true)}
                  className="text-xs text-red-400 hover:text-red-400/90"
                >
                  Disconnect
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded bg-white/5 dark:bg-black/5">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 flex items-center justify-center bg-white/10 dark:bg-black/10 rounded-lg">
                    <AtSign size={16} className="text-white" />
                  </div>
                  <div>
                    <div className="font-medium">X (Twitter) Account</div>
                    <div className="text-xs text-muted-foreground">
                      Not connected
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    // In a real app, you would initiate X OAuth connection
                    alert("X (Twitter) connection coming soon!");
                  }}
                  className="text-xs text-lime-400 hover:text-lime-400/90"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Layout Confirmation Modal */}
      {showResetLayout && (
        <div className="fixed inset-0 bg-black/50 dark:bg-white/50 backdrop-blur flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-80 max-w-md border border-white/10">
            <h2 className="text-xl font-bold mb-4">Reset Dashboard Layout</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              This will return your dashboard to the default card arrangement.
              All custom card positions, sizes, and order will be lost.
            </p>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowResetLayout(false)}
                className="px-4 py-2 rounded-md border border-white/10 dark:border-black/10 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleResetLayout}
                className="px-4 py-2 rounded-md bg-lime-400 text-black hover:bg-lime-400/90"
              >
                Reset Layout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disconnect Account Confirmation Modal */}
      {showDisconnectAccount && (
        <div className="fixed inset-0 bg-black/50 dark:bg-white/50 backdrop-blur flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-80 max-w-md border border-white/10">
            <h2 className="text-xl font-bold mb-4">Disconnect Account</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              This will sign you out of Vireo. You'll need to sign in again to access your account.
            </p>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowDisconnectAccount(false)}
                className="px-4 py-2 rounded-md border border-white/10 dark:border-black/10 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnectAccount}
                className="px-4 py-2 rounded-md bg-red-400 text-white hover:bg-red-400/90"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}