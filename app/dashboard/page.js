import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import DashboardClient from "@/components/bookmarks/DashboardClient";
import InstallPrompt from "@/components/pwa/InstallPrompt";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[#050505]">
      <Navbar user={user} />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <DashboardClient
          initialBookmarks={bookmarks || []}
          userId={user.id}
        />
      </main>
      <InstallPrompt />
    </div>
  );
}
