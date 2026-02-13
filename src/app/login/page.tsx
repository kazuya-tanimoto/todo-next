"use client";

import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    const callbackUrl = redirectTo
      ? `${location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
      : `${location.origin}/auth/callback`;

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
      },
    });

    if (error) {
      setError("ログインに失敗しました。もう一度お試しください。");
      setIsLoading(false);
    }
  };

  return (
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
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 transition-colors duration-300">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
