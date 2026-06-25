import { createServerClient } from "@supabase/ssr";

export interface CapturedCookie {
  name: string;
  value: string;
}

// 本番と同じ @supabase/ssr のロジックで認証 cookie を生成させる。
// 手組みすると base64- プレフィックスやチャンク分割（.0/.1）の仕様差で壊れるため、
// 空の cookie jar を渡して signInWithPassword を実行し、setAll が書き込む値をそのまま採取する。
export async function captureAuthCookies(
  email: string,
  password: string,
): Promise<CapturedCookie[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");
  }

  let jar: CapturedCookie[] = [];
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return jar;
      },
      setAll(cookiesToSet) {
        jar = cookiesToSet.map(({ name, value }) => ({ name, value }));
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (jar.length === 0) {
    throw new Error("No auth cookies were captured after sign-in.");
  }
  return jar;
}
