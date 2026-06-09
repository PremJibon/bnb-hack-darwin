import { NextResponse } from "next/server";

// ─── Gist Proxy API ────────────────────────────────────────────────
// Proxies GitHub Gist requests from the server side so the
// GITHUB_TOKEN stays secure (never exposed to the client).
// Client calls /api/gist, server calls api.github.com with auth.
// ─────────────────────────────────────────────────────────────────────

export async function GET() {
  const gistId = process.env.NEXT_PUBLIC_GIST_ID;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!gistId) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_GIST_ID not configured" },
      { status: 400 }
    );
  }

  try {
    const headers: Record<string, string> = {
      "Accept": "application/vnd.github.v3+json",
    };

    // Add auth token if available (required for secret Gists, higher rate limit)
    if (githubToken) {
      headers["Authorization"] = `Bearer ${githubToken}`;
    }

    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`GitHub Gist API error ${res.status}:`, errorText);
      return NextResponse.json(
        { error: `GitHub API returned ${res.status}`, detail: errorText },
        { status: res.status }
      );
    }

    const gist = await res.json();
    const content = gist.files?.["darwin_state.json"]?.content;

    if (!content) {
      return NextResponse.json(
        { error: "darwin_state.json not found in Gist" },
        { status: 404 }
      );
    }

    // Parse and return the state
    const state = JSON.parse(content);
    return NextResponse.json({ success: true, state });
  } catch (error: any) {
    console.error("Gist proxy error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch Gist" },
      { status: 500 }
    );
  }
}
