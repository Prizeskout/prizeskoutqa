import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { hydrateLocaleFromServer } from "@/lib/locale-sync";

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Patch window.fetch once so that all /_server/* requests (TanStack Start
  // server functions) carry the Supabase session Bearer token. Without this,
  // the requireSupabaseAuth middleware rejects every call with 401.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const orig = window.fetch.bind(window);
    window.fetch = async function patchedFetch(input, init) {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url;
      if (url.includes("/_server")) {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s?.access_token) {
          const headers = new Headers((init?.headers as HeadersInit | undefined) ?? {});
          if (!headers.has("authorization")) {
            headers.set("Authorization", `Bearer ${s.access_token}`);
          }
          init = { ...init, headers };
        }
      }
      return orig(input, init);
    };
    // Keep the interceptor for the app's lifetime — no cleanup needed here
    // since AuthProvider is mounted once at the root and never unmounts.
  }, []);

  useEffect(() => {
    // CRITICAL: subscribe BEFORE getSession to avoid race conditions
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
      // Adopt the account's saved language once we know who is signed in.
      if (newSession?.user) void hydrateLocaleFromServer();
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      setLoading(false);
      if (existing?.user) void hydrateLocaleFromServer();
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
