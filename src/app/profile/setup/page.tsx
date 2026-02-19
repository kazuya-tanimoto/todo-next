"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const DISPLAY_NAME_MAX_LENGTH = 30;

function ProfileSetupForm() {
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || ignore) return;

      // Check if profile already exists (editing mode)
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .single();

      if (ignore) return;

      if (profile) {
        setDisplayName(profile.display_name);
        setIsEditing(true);
      } else {
        // Default to Google display name
        setDisplayName(user.user_metadata?.full_name ?? "");
      }
      setIsLoading(false);
    };
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = displayName.trim();

    if (trimmed.length === 0) {
      setError("ニックネームを入力してください");
      return;
    }
    if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
      setError(`${DISPLAY_NAME_MAX_LENGTH}文字以内で入力してください`);
      return;
    }

    setIsSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: dbError } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: trimmed,
    });

    if (dbError) {
      setError("保存に失敗しました。もう一度お試しください。");
      setIsSaving(false);
      return;
    }

    router.push(redirectTo);
  };

  if (isLoading) {
    return (
      <div className="theme-card p-8 w-full max-w-sm text-center">
        <p className="text-[var(--fg-secondary)]">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="theme-card p-8 w-full max-w-sm">
      <h1 className="text-2xl font-black uppercase tracking-tight mb-2 text-center">
        {isEditing ? "ニックネーム変更" : "ニックネーム登録"}
      </h1>
      <p className="text-[var(--fg-secondary)] text-sm mb-6 text-center">
        共有リストで表示される名前です
      </p>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="ニックネーム"
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          className="theme-input w-full px-4 py-3 mb-1"
          autoFocus
        />
        <p className="text-xs text-[var(--fg-secondary)] mb-4 text-right">
          {displayName.length}/{DISPLAY_NAME_MAX_LENGTH}
        </p>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={isSaving}
          className="theme-btn w-full px-6 py-3"
        >
          {isSaving ? "保存中..." : "保存"}
        </button>
      </form>
    </div>
  );
}

export default function ProfileSetupPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 transition-colors duration-300">
      <Suspense>
        <ProfileSetupForm />
      </Suspense>
    </div>
  );
}
