import OpenAI from "openai";
import { DOMAIN_MAP } from "@/lib/core/categories";
import { extractDomain } from "@/lib/core/url";

const gemini = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

export function domainFallback(url, meta, userTitle) {
  const domain = extractDomain(url);

  const category =
    DOMAIN_MAP[domain] ||
    Object.entries(DOMAIN_MAP).find(
      ([k]) => domain.endsWith(k) || domain.includes(k.split(".")[0])
    )?.[1] ||
    "Other";

  return {
    category,
    tags: [domain.split(".")[0]],
    summary: `Bookmarked from ${domain}`,
    suggestedTitle: meta?.title || userTitle || domain,
    pageTitle: meta?.title || "",
  };
}

export async function fetchPageMetadata(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; KeepBookmark/1.0; +https://keepbookmark.app)",
      },
    });
    clearTimeout(timeout);

    const html = await res.text();

    const getTag = (name) => {
      const m =
        html.match(
          new RegExp(
            `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)`,
            "i"
          )
        ) ||
        html.match(
          new RegExp(
            `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`,
            "i"
          )
        );
      return m ? m[1] : "";
    };

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

    return {
      title: getTag("og:title") || (titleMatch ? titleMatch[1].trim() : ""),
      description: getTag("og:description") || getTag("description") || "",
      siteName: getTag("og:site_name") || "",
      keywords: getTag("keywords") || "",
    };
  } catch {
    return { title: "", description: "", siteName: "", keywords: "" };
  }
}

export async function categorizeWithAI(url, domain, meta, userTitle) {
  const prompt = `You are a smart bookmark organizer. Analyze this webpage and return a JSON object.

URL: ${url}
Domain: ${domain}
Page Title: ${meta.title || userTitle || "Unknown"}
Description: ${meta.description || "None"}
Site Name: ${meta.siteName || "Unknown"}
Keywords: ${meta.keywords || "None"}

Return ONLY a valid JSON object (no markdown, no backticks) with these fields:
{
  "category": "one of: Development, Design, News, Social Media, Video, Music, Shopping, Finance, Education, Health, Travel, Food, Sports, Gaming, Productivity, Reference, Entertainment, Business, Science, Other",
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "A concise one-line summary of what this page is about (max 15 words)",
  "suggestedTitle": "A clean, readable title for bookmarking (max 8 words)"
}

Rules:
- IMPORTANT: Use the URL and domain to determine the category even if metadata is missing or sparse.
- Well-known sites MUST be categorized correctly based on what they are, for example:
  youtube.com → Video, chatgpt.com/chat.openai.com → Productivity, github.com → Development,
  twitter.com/x.com → Social Media, instagram.com → Social Media, reddit.com → Social Media,
  spotify.com → Music, amazon.com → Shopping, netflix.com → Entertainment,
  stackoverflow.com → Development, figma.com → Design, dribbble.com → Design,
  medium.com → News, linkedin.com → Social Media, twitch.tv → Entertainment,
  notion.so → Productivity, google.com → Productivity, wikipedia.org → Reference
- NEVER use "Other" if the site clearly fits one of the categories above
- Pick the single BEST category from the list
- Generate 2-4 short, relevant lowercase tags (no hashtags)
- Summary should be helpful and descriptive
- suggestedTitle should be concise and clear`;

  const response = await gemini.chat.completions.create({
    model: process.env.GEMINI_MODEL,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.choices?.[0]?.message?.content?.trim() || "";
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const aiData = JSON.parse(cleaned);

  return {
    category: aiData.category || "Other",
    tags: Array.isArray(aiData.tags) ? aiData.tags.slice(0, 4) : [],
    summary: aiData.summary || "",
    suggestedTitle: aiData.suggestedTitle || meta.title || userTitle || "",
    pageTitle: meta.title || "",
  };
}
