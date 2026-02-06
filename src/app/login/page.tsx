"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError("ログインに失敗しました。もう一度お試しください。");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 transition-colors duration-300">
      <div className="theme-card p-8 w-full max-w-sm text-center">
        <h1 className="text-3xl font-black uppercase tracking-tight mb-2">
          Todo
        </h1>
        <p className="text-[var(--fg-secondary)] mb-8">
          ログインして始めましょう
        </p>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="theme-btn w-full px-6 py-3 flex items-center justify-center gap-3"
        >
          {isLoading ? "リダイレクト中..." : "Googleでログイン"}
        </button>
      </div>
    </div>
  );
}
