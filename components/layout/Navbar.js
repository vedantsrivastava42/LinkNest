"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function Navbar({ user }) {
  const router = useRouter();
  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.1] bg-black/60 backdrop-blur-xl" style={{ boxShadow: '0 1px 15px rgba(0,0,0,0.06)' }}>
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <h1 className="text-lg font-bold text-zinc-100">
          <span className="mr-2">🔖</span>LinkNest
        </h1>
        <div className="flex items-center gap-3">
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt=""
              className="h-7 w-7 rounded-full ring-2 ring-white/10"
              referrerPolicy="no-referrer"
            />
          )}
          <span className="hidden text-sm text-zinc-500 sm:inline">
            {displayName}
          </span>
          <button
            onClick={handleSignOut}
            className="cursor-pointer rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-zinc-400 backdrop-blur-sm transition-all hover:bg-white/[0.08] hover:text-zinc-200"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
