import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: bookmark } = await supabase
      .from("bookmarks")
      .select("click_count")
      .eq("id", id)
      .single();

    const newCount = (bookmark?.click_count || 0) + 1;

    const { error } = await supabase
      .from("bookmarks")
      .update({ click_count: newCount })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ click_count: newCount });
  } catch {
    return NextResponse.json({ error: "Failed to track click" }, { status: 500 });
  }
}
