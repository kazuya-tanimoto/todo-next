"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Profile, Theme } from "@/types";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import ListSelector from "@/components/ListSelector";
import TodoSection from "@/components/TodoSection";
import TrashView from "@/components/TrashView";

export default function Home() {
  const [theme, setTheme] = useState<Theme>("brutal");
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as Theme | null;
    if (storedTheme && ["mono", "natural", "brutal"].includes(storedTheme)) {
      setTheme(storedTheme);
    }
    const storedListId = localStorage.getItem("selectedListId");
    if (storedListId) {
      setSelectedListId(storedListId);
    }
    setIsLoaded(true);

    const loadProfile = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) setProfile(data);
    };
    loadProfile();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme, isLoaded]);

  // Set initial theme on mount
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  useEffect(() => {
    if (selectedListId) {
      localStorage.setItem("selectedListId", selectedListId);
    }
  }, [selectedListId]);

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 sm:p-8 transition-colors duration-300">
      <div className="mx-auto max-w-xl">
        {/* Header */}
        <header className="mb-8 flex items-start justify-between">
          <h1 className="text-4xl font-black uppercase tracking-tight mb-2">
            Todo
          </h1>
          <div className="flex items-center gap-3">
            {profile && (
              <button
                onClick={() => router.push("/profile/setup")}
                className="text-sm text-[var(--fg-secondary)] hover:text-[var(--fg)] transition-colors"
                title="ニックネームを変更"
              >
                {profile.display_name}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="theme-btn px-4 py-2 text-sm"
            >
              ログアウト
            </button>
          </div>
        </header>

        <ThemeSwitcher theme={theme} onThemeChange={setTheme} />
        <ListSelector
          selectedListId={showTrash ? null : selectedListId}
          onSelectList={(id) => {
            setShowTrash(false);
            setSelectedListId(id);
          }}
        />

        {/* Trash button */}
        <button
          onClick={() => setShowTrash((prev) => !prev)}
          className={`mb-6 flex items-center gap-2 text-sm transition-colors ${
            showTrash
              ? "text-[var(--fg)] font-bold"
              : "text-[var(--fg-secondary)] hover:text-[var(--fg)]"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Trash
        </button>

        {showTrash ? (
          <TrashView onClose={() => setShowTrash(false)} />
        ) : (
          <TodoSection selectedListId={selectedListId} />
        )}
      </div>
    </div>
  );
}
