import type { JSONContent } from "@tiptap/react";
import { extractCid } from "@/lib/atproto/blob-utils";
import type {
  LeafletLinearDocument,
  LeafletBlockWrapper,
  LeafletFacet,
  LeafletFacetFeature,
  LeafletUnorderedListItem,
  LeafletListItem,
  LeafletBlock,
} from "@/lib/atproto/project-types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Extract the YouTube video ID from any supported YouTube URL format:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube-nocookie.com/embed/VIDEO_ID
 * Returns null if the ID cannot be extracted.
 */
function extractYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    // youtube.com/watch?v=ID
    if (u.hostname.includes("youtube.com") && u.searchParams.has("v")) {
      return u.searchParams.get("v");
    }
    // youtu.be/ID
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1).split("/")[0] || null;
    }
    // youtube.com/embed/ID or youtube-nocookie.com/embed/ID
    const embedMatch = u.pathname.match(/\/embed\/([^/?]+)/);
    if (embedMatch) return embedMatch[1];
    return null;
  } catch {
    return null;
  }
}

/**
 * Infer a MIME type from a URL's file extension.
 * Returns a reasonable default if the extension is not recognized.
 */
function inferMimeTypeFromUrl(url: string): string {
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  // Default to jpeg for unknown extensions
  return "image/jpeg";
}

/**
 * Get the UTF-8 byte length of a string up to a given character index.
 */
function byteOffsetAt(text: string, charIndex: number): number {
  return encoder.encode(text.slice(0, charIndex)).length;
}

/**
 * Get the character index corresponding to a UTF-8 byte offset.
 * If byteOffset falls in the middle of a multi-byte UTF-8 sequence,
 * it is rounded back to the start of that sequence to avoid producing
 * U+FFFD replacement characters.
 */
function charIndexAtByteOffset(text: string, byteOffset: number): number {
  const bytes = encoder.encode(text);
  // Clamp to valid range
  let offset = Math.max(0, Math.min(byteOffset, bytes.length));
  // Walk back while we're pointing at a UTF-8 continuation byte (0x80–0xBF)
  while (offset > 0 && (bytes[offset] & 0xc0) === 0x80) {
    offset--;
  }
  const slice = bytes.slice(0, offset);
  return decoder.decode(slice).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// TipTap → Leaflet
// ─────────────────────────────────────────────────────────────────────────────

interface InlineSegment {
  text: string;
  marks: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

/**
 * Flatten TipTap inline content nodes into segments with marks.
 */
function flattenInlineContent(
  nodes: JSONContent[] | undefined
): InlineSegment[] {
  if (!nodes) return [];
  const segments: InlineSegment[] = [];
  for (const node of nodes) {
    if (node.type === "text") {
      segments.push({
        text: node.text ?? "",
        marks: (node.marks ?? []) as Array<{
          type: string;
          attrs?: Record<string, unknown>;
        }>,
      });
    } else if (node.type === "hardBreak") {
      segments.push({ text: "\n", marks: [] });
    }
  }
  return segments;
}

/**
 * Convert inline segments to plaintext + facets.
 */
function extractTextAndFacets(
  nodes: JSONContent[] | undefined
): { text: string; facets: LeafletFacet[] } {
  const segments = flattenInlineContent(nodes);
  let plaintext = "";
  const facets: LeafletFacet[] = [];

  for (const seg of segments) {
    if (!seg.text) continue;
    if (seg.marks.length > 0) {
      const byteStart = encoder.encode(plaintext).length;
      plaintext += seg.text;
      const byteEnd = encoder.encode(plaintext).length;

      const features: LeafletFacetFeature[] = [];
      for (const mark of seg.marks) {
        switch (mark.type) {
          case "bold":
            features.push({ $type: "pub.leaflet.richtext.facet#bold" });
            break;
          case "italic":
            features.push({ $type: "pub.leaflet.richtext.facet#italic" });
            break;
          case "code":
            features.push({ $type: "pub.leaflet.richtext.facet#code" });
            break;
          case "strike":
            features.push({
              $type: "pub.leaflet.richtext.facet#strikethrough",
            });
            break;
          case "underline":
            features.push({ $type: "pub.leaflet.richtext.facet#underline" });
            break;
          case "highlight":
            features.push({ $type: "pub.leaflet.richtext.facet#highlight" });
            break;
          case "link": {
            const href =
              (mark.attrs?.href as string) ?? (mark.attrs?.url as string) ?? "";
            features.push({
              $type: "pub.leaflet.richtext.facet#link",
              uri: href,
            });
            break;
          }
          // Unrecognized marks are silently ignored — text is still included in plaintext
        }
      }

      if (features.length > 0) {
        facets.push({
          index: { byteStart, byteEnd },
          features,
        });
      }
    } else {
      plaintext += seg.text;
    }
  }

  return { text: plaintext, facets };
}

/**
 * Convert a TipTap listItem node to a canonical LeafletListItem.
 */
function listItemToLeaflet(item: JSONContent): LeafletListItem {
  const nodeChildren = item.content ?? [];
  let text = "";
  let facets: LeafletFacet[] = [];
  const nestedChildren: LeafletListItem[] = [];

  for (const child of nodeChildren) {
    if (child.type === "paragraph") {
      const extracted = extractTextAndFacets(child.content);
      text = extracted.text;
      facets = extracted.facets;
    } else if (child.type === "bulletList") {
      for (const nestedItem of child.content ?? []) {
        nestedChildren.push(listItemToLeaflet(nestedItem));
      }
    }
  }

  const contentBlock = {
    $type: "pub.leaflet.blocks.text" as const,
    plaintext: text,
    ...(facets.length > 0 ? { facets } : {}),
  };

  const result: LeafletListItem = {
    $type: "pub.leaflet.blocks.unorderedList#listItem" as const,
    content: contentBlock,
  };
  if (nestedChildren.length > 0) result.children = nestedChildren;
  return result;
}

/**
 * Convert a TipTap JSONContent document to a LeafletLinearDocument.
 */
export function tiptapToLeaflet(doc: JSONContent): LeafletLinearDocument {
  const blocks: LeafletBlockWrapper[] = [];

  const topLevelNodes = doc.content ?? [];

  for (const node of topLevelNodes) {
    let block: LeafletBlock | null = null;

    switch (node.type) {
      case "paragraph": {
        const { text, facets } = extractTextAndFacets(node.content);
        block = {
          $type: "pub.leaflet.blocks.text",
          plaintext: text,
          ...(facets.length > 0 ? { facets } : {}),
        };
        break;
      }

      case "heading": {
        const level = (node.attrs?.level as number) ?? 1;
        const { text, facets } = extractTextAndFacets(node.content);
        block = {
          $type: "pub.leaflet.blocks.header",
          plaintext: text,
          level,
          ...(facets.length > 0 ? { facets } : {}),
        };
        break;
      }

      case "image": {
        const src = (node.attrs?.src as string) ?? "";
        const alt = (node.attrs?.alt as string) ?? "";
        const cid = (node.attrs?.cid as string) ?? "";
        // Prefer explicit mimeType/size attrs; fall back to inferring from URL extension
        const attrMimeType = node.attrs?.mimeType as string | undefined;
        const attrSize = node.attrs?.size as number | undefined;
        const inferredMimeType = attrMimeType ?? inferMimeTypeFromUrl(src);
        const resolvedSize = attrSize ?? 0;
        block = {
          $type: "pub.leaflet.blocks.image",
          image: {
            $type: "blob",
            ref: { $link: cid || src },
            mimeType: inferredMimeType,
            size: resolvedSize,
          },
          alt,
          aspectRatio: { width: 800, height: 600 },
        };
        break;
      }

      case "blockquote": {
        // Flatten all paragraphs inside blockquote, join with \n
        const paragraphs = (node.content ?? []).filter(
          (n) => n.type === "paragraph"
        );
        const parts: string[] = [];
        const allFacets: LeafletFacet[] = [];
        let byteOffset = 0;

        for (let i = 0; i < paragraphs.length; i++) {
          const { text, facets } = extractTextAndFacets(
            paragraphs[i].content
          );
          // Shift facet byte offsets
          for (const facet of facets) {
            allFacets.push({
              ...facet,
              index: {
                byteStart: facet.index.byteStart + byteOffset,
                byteEnd: facet.index.byteEnd + byteOffset,
              },
            });
          }
          parts.push(text);
          byteOffset += encoder.encode(text).length;
          if (i < paragraphs.length - 1) {
            byteOffset += 1; // for the \n separator
          }
        }

        const combinedText = parts.join("\n");
        block = {
          $type: "pub.leaflet.blocks.blockquote",
          plaintext: combinedText,
          ...(allFacets.length > 0 ? { facets: allFacets } : {}),
        };
        break;
      }

      case "bulletList": {
        const children = (node.content ?? []).map(listItemToLeaflet);
        block = {
          $type: "pub.leaflet.blocks.unorderedList",
          children,
        };
        break;
      }

      case "codeBlock": {
        const lang = (node.attrs?.language as string) ?? undefined;
        const codeText = (node.content ?? [])
          .filter((n) => n.type === "text")
          .map((n) => n.text ?? "")
          .join("");
        block = {
          $type: "pub.leaflet.blocks.code",
          plaintext: codeText,
          ...(lang ? { language: lang } : {}),
        };
        break;
      }

      case "horizontalRule": {
        block = { $type: "pub.leaflet.blocks.horizontalRule" };
        break;
      }

      case "youtube": {
        const src = (node.attrs?.src as string) ?? "";
        // Normalize to canonical YouTube watch URL for stable storage
        const videoId = extractYouTubeVideoId(src);
        const canonicalUrl = videoId
          ? `https://www.youtube.com/watch?v=${videoId}`
          : src; // fallback to original if we can't extract ID
        block = {
          $type: "pub.leaflet.blocks.iframe",
          url: canonicalUrl,
        };
        break;
      }

      default:
        // Skip unknown node types
        break;
    }

    if (block) {
      blocks.push({ $type: "pub.leaflet.pages.linearDocument#block" as const, block });
    }
  }

  return {
    $type: "pub.leaflet.pages.linearDocument",
    blocks,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaflet → TipTap
// ─────────────────────────────────────────────────────────────────────────────

interface MarkSpec {
  type: string;
  attrs?: Record<string, unknown>;
}

interface TextSegment {
  text: string;
  marks: MarkSpec[];
}

/**
 * Convert a single LeafletFacetFeature to a TipTap MarkSpec.
 * Returns null for unknown/unsupported feature types (they are filtered out by the caller).
 */
function featureToMark(feature: LeafletFacetFeature): MarkSpec | null {
  switch (feature.$type) {
    case "pub.leaflet.richtext.facet#bold":
      return { type: "bold" };
    case "pub.leaflet.richtext.facet#italic":
      return { type: "italic" };
    case "pub.leaflet.richtext.facet#code":
      return { type: "code" };
    case "pub.leaflet.richtext.facet#strikethrough":
      return { type: "strike" };
    case "pub.leaflet.richtext.facet#underline":
      return { type: "underline" };
    case "pub.leaflet.richtext.facet#highlight":
      return { type: "highlight" };
    case "pub.leaflet.richtext.facet#link":
      return {
        type: "link",
        attrs: { href: feature.uri, target: "_blank" },
      };
    default:
      // Unknown feature types (e.g. didMention, atMention, id) are ignored
      return null;
  }
}

/**
 * Reconstruct TipTap inline content from plaintext + byte-indexed facets.
 *
 * Handles overlapping facets correctly by using a sweep-line over all unique
 * byte boundaries, collecting the union of marks active in each sub-segment.
 * No text is ever lost regardless of how facets overlap.
 */
function facetsToInlineContent(
  plaintext: string,
  facets?: LeafletFacet[]
): JSONContent[] {
  if (!plaintext) return [];
  if (!facets || facets.length === 0) {
    return [{ type: "text", text: plaintext }];
  }

  const bytes = encoder.encode(plaintext);
  const totalBytes = bytes.length;

  // Collect all unique boundary points, clamped to [0, totalBytes]
  const boundarySet = new Set<number>([0, totalBytes]);
  for (const facet of facets) {
    const s = Math.max(0, Math.min(facet.index.byteStart, totalBytes));
    const e = Math.max(0, Math.min(facet.index.byteEnd, totalBytes));
    boundarySet.add(s);
    boundarySet.add(e);
  }
  const boundaries = Array.from(boundarySet).sort((a, b) => a - b);

  // For each sub-segment between consecutive boundaries, collect active marks
  const segments: TextSegment[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const segStart = boundaries[i];
    const segEnd = boundaries[i + 1];
    if (segStart >= segEnd) continue;

    const segBytes = bytes.slice(segStart, segEnd);
    const segText = decoder.decode(segBytes);
    if (!segText) continue;

    // Collect marks from all facets that cover this sub-segment
    const marks: MarkSpec[] = [];
    const seenMarkKeys = new Set<string>();
    for (const facet of facets) {
      const fs = Math.max(0, Math.min(facet.index.byteStart, totalBytes));
      const fe = Math.max(0, Math.min(facet.index.byteEnd, totalBytes));
      if (fs <= segStart && fe >= segEnd) {
        for (const feature of facet.features) {
          const mark = featureToMark(feature);
          // Skip unknown features (featureToMark returns null for them)
          if (mark === null) continue;
          // Deduplicate marks by type (+ href for links)
          const key =
            mark.type === "link"
              ? `link:${(mark.attrs as { href: string } | undefined)?.href ?? ""}`
              : mark.type;
          if (!seenMarkKeys.has(key)) {
            seenMarkKeys.add(key);
            marks.push(mark);
          }
        }
      }
    }

    segments.push({ text: segText, marks });
  }

  return segments.map((seg) => ({
    type: "text",
    text: seg.text,
    ...(seg.marks.length > 0 ? { marks: seg.marks } : {}),
  }));
}

/**
 * Convert a canonical LeafletListItem to a TipTap listItem node.
 */
function leafletListItemToTiptap(item: LeafletListItem): JSONContent {
  const content = item.content;
  // Extract text and facets from the content block
  const text =
    content.$type === "pub.leaflet.blocks.text" ||
    content.$type === "pub.leaflet.blocks.header"
      ? (content.plaintext ?? content.text ?? "")
      : "";
  const facets =
    content.$type === "pub.leaflet.blocks.text" ||
    content.$type === "pub.leaflet.blocks.header"
      ? content.facets
      : undefined;

  const paragraphContent = facetsToInlineContent(text, facets);
  const tiptapChildren: JSONContent[] = [
    {
      type: "paragraph",
      content: paragraphContent,
    },
  ];

  if (item.children && item.children.length > 0) {
    tiptapChildren.push({
      type: "bulletList",
      content: item.children.map(leafletListItemToTiptap),
    });
  }

  return {
    type: "listItem",
    content: tiptapChildren,
  };
}

/**
 * Convert a legacy LeafletUnorderedListItem to a TipTap listItem node.
 * Used for backward compatibility when reading old records that used the 'items' field.
 */
function legacyListItemToTiptap(item: LeafletUnorderedListItem): JSONContent {
  const paragraphContent = facetsToInlineContent(item.text, item.facets);
  const tiptapChildren: JSONContent[] = [
    {
      type: "paragraph",
      content: paragraphContent,
    },
  ];

  if (item.items && item.items.length > 0) {
    tiptapChildren.push({
      type: "bulletList",
      content: item.items.map(legacyListItemToTiptap),
    });
  }

  return {
    type: "listItem",
    content: tiptapChildren,
  };
}

/**
 * Convert a LeafletLinearDocument to a TipTap JSONContent document.
 */
export function leafletToTiptap(doc: LeafletLinearDocument): JSONContent {
  const content: JSONContent[] = [];

  for (const wrapper of doc.blocks) {
    const block = wrapper.block;

    switch (block.$type) {
      case "pub.leaflet.blocks.text": {
        const textContent = block.plaintext ?? block.text ?? "";
        const inlineContent = facetsToInlineContent(textContent, block.facets);
        content.push({
          type: "paragraph",
          content: inlineContent,
        });
        break;
      }

      case "pub.leaflet.blocks.header": {
        const textContent = block.plaintext ?? block.text ?? "";
        const inlineContent = facetsToInlineContent(textContent, block.facets);
        content.push({
          type: "heading",
          attrs: { level: block.level },
          content: inlineContent,
        });
        break;
      }

      case "pub.leaflet.blocks.image": {
        // The image src will be constructed from the BlobRef by the editor component
        const cid = extractCid(block.image) ?? "";
        content.push({
          type: "image",
          attrs: {
            src: cid, // Will be replaced with full URL by the editor
            alt: block.alt ?? "",
            cid,
            mimeType: block.image.mimeType,
            size: block.image.size,
          },
        });
        break;
      }

      case "pub.leaflet.blocks.blockquote": {
        // Fix abd: prefer plaintext (canonical) over legacy text field
        // Fix ofk: clip facets spanning newline boundaries instead of dropping them
        const blockText = block.plaintext ?? block.text ?? "";
        const lines = blockText.split("\n");
        const bytes = encoder.encode(blockText);
        const paragraphs: JSONContent[] = [];
        let byteOffset = 0;

        for (let i = 0; i < lines.length; i++) {
          const lineText = lines[i];
          const lineByteLen = encoder.encode(lineText).length;
          const lineByteEnd = byteOffset + lineByteLen;

          // Extract facets that overlap this line (clip to line boundaries).
          // Facets spanning a newline boundary are included in both lines they touch,
          // clipped to the line's byte range.
          const lineFacets: LeafletFacet[] = [];
          for (const facet of block.facets ?? []) {
            const fs = facet.index.byteStart;
            const fe = facet.index.byteEnd;
            // Include if the facet overlaps this line at all
            if (fs < lineByteEnd && fe > byteOffset) {
              const clippedStart = Math.max(fs, byteOffset) - byteOffset;
              const clippedEnd = Math.min(fe, lineByteEnd) - byteOffset;
              if (clippedStart < clippedEnd) {
                lineFacets.push({
                  ...facet,
                  index: {
                    byteStart: clippedStart,
                    byteEnd: clippedEnd,
                  },
                });
              }
            }
          }

          const inlineContent = facetsToInlineContent(lineText, lineFacets);
          paragraphs.push({ type: "paragraph", content: inlineContent });

          byteOffset = lineByteEnd + 1; // +1 for the \n
        }

        content.push({
          type: "blockquote",
          content: paragraphs,
        });

        // Suppress unused variable warning
        void bytes;
        break;
      }

      case "pub.leaflet.blocks.unorderedList": {
        // Canonical format uses children; fall back to legacy items for old records
        const canonicalChildren = block.children;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const legacyItems = (block as any).items as LeafletUnorderedListItem[] | undefined;
        if (canonicalChildren && canonicalChildren.length > 0) {
          content.push({
            type: "bulletList",
            content: canonicalChildren.map(leafletListItemToTiptap),
          });
        } else if (legacyItems && legacyItems.length > 0) {
          content.push({
            type: "bulletList",
            content: legacyItems.map(legacyListItemToTiptap),
          });
        }
        break;
      }

      case "pub.leaflet.blocks.code": {
        // Fix abd: prefer plaintext (canonical) over legacy code field
        const codeText = block.plaintext ?? block.code ?? "";
        content.push({
          type: "codeBlock",
          attrs: { language: block.language ?? block.lang ?? null },
          content: [{ type: "text", text: codeText }],
        });
        break;
      }

      case "pub.leaflet.blocks.horizontalRule": {
        content.push({ type: "horizontalRule" });
        break;
      }

      case "pub.leaflet.blocks.iframe": {
        const url = block.url;
        const isYoutube =
          url.includes("youtube.com") || url.includes("youtu.be");
        if (isYoutube) {
          content.push({
            type: "youtube",
            attrs: { src: url },
          });
        } else {
          // Fallback: render as a paragraph with a link
          content.push({
            type: "paragraph",
            content: [
              {
                type: "text",
                text: url,
                marks: [{ type: "link", attrs: { href: url, target: "_blank" } }],
              },
            ],
          });
        }
        break;
      }

      case "pub.leaflet.blocks.website": {
        content.push({
          type: "paragraph",
          content: [
            {
              type: "text",
              text: block.title ?? block.src,
              marks: [
                {
                  type: "link",
                  attrs: { href: block.src, target: "_blank" },
                },
              ],
            },
          ],
        });
        break;
      }

      default:
        // Skip unknown block types
        break;
    }
  }

  // Ensure there's at least one paragraph
  if (content.length === 0) {
    content.push({ type: "paragraph" });
  }

  return {
    type: "doc",
    content,
  };
}

// Export byte offset utilities for use in other modules
export { byteOffsetAt, charIndexAtByteOffset };
