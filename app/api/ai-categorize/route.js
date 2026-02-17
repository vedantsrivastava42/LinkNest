import { NextResponse } from "next/server";
import { extractDomain } from "@/lib/core/url";
import {
  fetchPageMetadata,
  categorizeWithAI,
  domainFallback,
} from "@/lib/services/ai";

export async function POST(request) {
  const { url, userTitle } = await request.json();

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const domain = extractDomain(url);
  const meta = await fetchPageMetadata(url);

  try {
    const result = await categorizeWithAI(url, domain, meta, userTitle);
    return NextResponse.json(result);
  } catch (err) {
    console.error("AI categorization error:", err);
    return NextResponse.json(domainFallback(url, meta, userTitle));
  }
}
