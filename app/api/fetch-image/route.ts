import { NextRequest, NextResponse } from "next/server";

/**
 * API route handler to fetch media (image or video) from a URL server-side, bypassing CORS.
 *
 * POST: Expects a JSON body: { imageUrl: string }
 * GET: Expects a query parameter: ?url=<encoded-url>
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const imageUrl: unknown = body.imageUrl;

    return await fetchAndProxy(imageUrl);
  } catch (error) {
    console.error("[API Fetch Image] Error:", error);
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 }
    );
  }
}

/**
 * GET handler for proxying media via query parameter.
 * Used by <video> and <img> elements that can't do POST.
 */
export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url");
    return await fetchAndProxy(url);
  } catch (error) {
    console.error("[API Fetch Image GET] Error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 }
    );
  }
}

async function fetchAndProxy(url: unknown): Promise<NextResponse> {
  // Validate input
  if (
    typeof url !== "string" ||
    !url ||
    !(url.startsWith("http://") || url.startsWith("https://"))
  ) {
    return NextResponse.json(
      { error: "Invalid or missing URL" },
      { status: 400 }
    );
  }

  // Fetch the media from the URL on the server
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    },
  });

  if (!response.ok) {
    console.error(
      `[API Fetch] Failed to fetch from ${url}: ${response.status} ${response.statusText}`
    );
    return NextResponse.json(
      { error: `Failed to fetch: ${response.statusText}` },
      { status: response.status }
    );
  }

  // Check content type — accept images AND videos
  const contentType = response.headers.get("content-type") || "";
  const isImage = contentType.startsWith("image/");
  const isVideo = contentType.startsWith("video/");

  if (!isImage && !isVideo) {
    console.error(
      `[API Fetch] Fetched content from ${url} is not an image or video: ${contentType}`
    );
    return NextResponse.json(
      { error: "The fetched URL did not return an image or video." },
      { status: 400 }
    );
  }

  // Get media data as Blob
  const blob = await response.blob();

  // Return the blob directly
  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Accept-Ranges", "bytes");

  return new NextResponse(blob, {
    status: 200,
    statusText: "OK",
    headers: headers,
  });
}
