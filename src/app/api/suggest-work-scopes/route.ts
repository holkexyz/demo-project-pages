import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Rate limiting note: For production, add rate limiting here (e.g., using
// Upstash Redis or Vercel's built-in rate limiting) to prevent abuse.

interface AvailableTag {
  key: string;
  label: string;
  kind: string;
  description: string;
}

interface SuggestedTag {
  key: string;
  confidence: number;
  reason: string;
}

interface RequestBody {
  title: string;
  description: string;
  availableTags: AvailableTag[];
}

function getMockSuggestions(availableTags: AvailableTag[]): SuggestedTag[] {
  // Pick 3-5 random tags with confidence 0.7-0.9
  const count = Math.floor(Math.random() * 3) + 3; // 3 to 5
  const shuffled = [...availableTags].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));
  return selected.map((tag) => ({
    key: tag.key,
    confidence: Math.round((Math.random() * 0.2 + 0.7) * 100) / 100, // 0.70 to 0.90
    reason: "Mock suggestion (no API key configured)",
  }));
}

function stripMarkdownFences(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrappers
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();
}

export async function POST(request: NextRequest) {
  let body: RequestBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const { title, description, availableTags } = body;

  // Validate required fields
  if (!title || typeof title !== "string" || title.trim() === "") {
    return NextResponse.json(
      { error: "Missing required field: title" },
      { status: 400 }
    );
  }

  if (
    !description ||
    typeof description !== "string" ||
    description.trim() === ""
  ) {
    return NextResponse.json(
      { error: "Missing required field: description" },
      { status: 400 }
    );
  }

  if (!Array.isArray(availableTags) || availableTags.length === 0) {
    return NextResponse.json(
      { error: "availableTags must be a non-empty array" },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;

  // Mock fallback when no API key is configured
  if (!apiKey) {
    const mockSuggestions = getMockSuggestions(availableTags);
    const sorted = mockSuggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);
    return NextResponse.json({ suggestedTags: sorted });
  }

  try {
    const client = new OpenAI({ apiKey });

    const tagList = availableTags
      .map(
        (t) =>
          `- key: "${t.key}", label: "${t.label}", kind: "${t.kind}", description: "${t.description}"`
      )
      .join("\n");

    const systemPrompt = `You are helping classify nature regeneration work activities into a structured taxonomy.

Available work scope tags:
${tagList}

Given a work activity title and description, select the most relevant tags from the list above.
Return ONLY a JSON array (no markdown fences, no extra text) with objects having these fields:
- key: the tag key (must be one of the keys listed above)
- confidence: a number between 0.0 and 1.0 indicating how relevant this tag is
- reason: a single sentence explaining why this tag applies

Example output:
[{"key":"reforestation","confidence":0.95,"reason":"The activity directly involves planting trees to restore forest cover."}]`;

    const userMessage = `Title: ${title}\n\nDescription: ${description}`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.2,
    });

    const rawContent = completion.choices[0]?.message?.content ?? "[]";
    const cleaned = stripMarkdownFences(rawContent);

    let parsed: SuggestedTag[];
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse LLM response as JSON:", rawContent);
      return NextResponse.json(
        { error: "Failed to process LLM response" },
        { status: 500 }
      );
    }

    if (!Array.isArray(parsed)) {
      console.error("LLM response is not an array:", parsed);
      return NextResponse.json(
        { error: "Failed to process LLM response" },
        { status: 500 }
      );
    }

    // Build a set of valid keys for fast lookup
    const validKeys = new Set(availableTags.map((t) => t.key));

    // Filter out hallucinated keys, validate shape, sort by confidence, limit to 10
    const suggestedTags: SuggestedTag[] = parsed
      .filter(
        (item): item is SuggestedTag =>
          item !== null &&
          typeof item === "object" &&
          typeof item.key === "string" &&
          validKeys.has(item.key) &&
          typeof item.confidence === "number" &&
          item.confidence >= 0 &&
          item.confidence <= 1 &&
          typeof item.reason === "string"
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);

    return NextResponse.json({ suggestedTags });
  } catch (error) {
    console.error("LLM call failed:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}
