import type { JSONContent } from "@tiptap/react";
import type {
  LeafletLinearDocument,
  LeafletBlockWrapper,
  LeafletFacet,
  LeafletFacetFeature,
  LeafletUnorderedListItem,
  LeafletBlock,
} from "@/lib/atproto/project-types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Get the UTF-8 byte length of a string up to a given character index.
 */
function byteOffsetAt(text: string, charIndex: number): number {
  return encoder.encode(text.slice(0, charIndex)).length;
}

/**
 * Get the character index corresponding to a UTF-8 byte offset.
 */
function charIndexAtByteOffset(text: string, byteOffset: number): number {
  const bytes = encoder.encode(text);
  const slice = bytes.slice(0, byteOffset);
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
          case "link": {
            const href =
              (mark.attrs?.href as string) ?? (mark.attrs?.url as string) ?? "";
            features.push({
              $type: "pub.leaflet.richtext.facet#link",
              uri: href,
            });
            break;
          }
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
 * Convert a TipTap listItem node to a LeafletUnorderedListItem.
 */
function listItemToLeaflet(item: JSONContent): LeafletUnorderedListItem {
  const children = item.content ?? [];
  let text = "";
  let facets: LeafletFacet[] = [];
  const nestedItems: LeafletUnorderedListItem[] = [];

  for (const child of children) {
    if (child.type === "paragraph") {
      const extracted = extractTextAndFacets(child.content);
      text = extracted.text;
      facets = extracted.facets;
    } else if (child.type === "bulletList") {
      for (const nestedItem of child.content ?? []) {
        nestedItems.push(listItemToLeaflet(nestedItem));
      }
    }
  }

  const result: LeafletUnorderedListItem = { text };
  if (facets.length > 0) result.facets = facets;
  if (nestedItems.length > 0) result.items = nestedItems;
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
          text,
          ...(facets.length > 0 ? { facets } : {}),
        };
        break;
      }

      case "heading": {
        const level = (node.attrs?.level as number) ?? 1;
        const { text, facets } = extractTextAndFacets(node.content);
        block = {
          $type: "pub.leaflet.blocks.header",
          text,
          level,
          ...(facets.length > 0 ? { facets } : {}),
        };
        break;
      }

      case "image": {
        const src = (node.attrs?.src as string) ?? "";
        const alt = (node.attrs?.alt as string) ?? "";
        const cid = (node.attrs?.cid as string) ?? "";
        block = {
          $type: "pub.leaflet.blocks.image",
          image: {
            $type: "blob",
            ref: { $link: cid || src },
            mimeType: "image/jpeg",
            size: 0,
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
          text: combinedText,
          ...(allFacets.length > 0 ? { facets: allFacets } : {}),
        };
        break;
      }

      case "bulletList": {
        const items = (node.content ?? []).map(listItemToLeaflet);
        block = {
          $type: "pub.leaflet.blocks.unorderedList",
          items,
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
          code: codeText,
          ...(lang ? { lang } : {}),
        };
        break;
      }

      case "horizontalRule": {
        block = { $type: "pub.leaflet.blocks.horizontalRule" };
        break;
      }

      case "youtube": {
        const src = (node.attrs?.src as string) ?? "";
        block = {
          $type: "pub.leaflet.blocks.iframe",
          url: src,
        };
        break;
      }

      default:
        // Skip unknown node types
        break;
    }

    if (block) {
      blocks.push({ block });
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
 */
function featureToMark(feature: LeafletFacetFeature): MarkSpec {
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
    case "pub.leaflet.richtext.facet#link":
      return {
        type: "link",
        attrs: { href: feature.uri, target: "_blank" },
      };
    default:
      return { type: "bold" }; // fallback
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
 * Convert a LeafletUnorderedListItem to a TipTap listItem node.
 */
function leafletListItemToTiptap(item: LeafletUnorderedListItem): JSONContent {
  const paragraphContent = facetsToInlineContent(item.text, item.facets);
  const children: JSONContent[] = [
    {
      type: "paragraph",
      content: paragraphContent,
    },
  ];

  if (item.items && item.items.length > 0) {
    children.push({
      type: "bulletList",
      content: item.items.map(leafletListItemToTiptap),
    });
  }

  return {
    type: "listItem",
    content: children,
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
        const inlineContent = facetsToInlineContent(block.text, block.facets);
        content.push({
          type: "paragraph",
          content: inlineContent,
        });
        break;
      }

      case "pub.leaflet.blocks.header": {
        const inlineContent = facetsToInlineContent(block.text, block.facets);
        content.push({
          type: "heading",
          attrs: { level: block.level },
          content: inlineContent,
        });
        break;
      }

      case "pub.leaflet.blocks.image": {
        // The image src will be constructed from the BlobRef by the editor component
        const cid = block.image.ref.$link;
        content.push({
          type: "image",
          attrs: {
            src: cid, // Will be replaced with full URL by the editor
            alt: block.alt ?? "",
            cid,
          },
        });
        break;
      }

      case "pub.leaflet.blocks.blockquote": {
        // Split on \n to reconstruct paragraphs
        const lines = block.text.split("\n");
        const bytes = encoder.encode(block.text);
        const paragraphs: JSONContent[] = [];
        let byteOffset = 0;

        for (let i = 0; i < lines.length; i++) {
          const lineText = lines[i];
          const lineByteLen = encoder.encode(lineText).length;
          const lineByteEnd = byteOffset + lineByteLen;

          // Extract facets that fall within this line
          const lineFacets: LeafletFacet[] = [];
          for (const facet of block.facets ?? []) {
            const fs = facet.index.byteStart;
            const fe = facet.index.byteEnd;
            if (fs >= byteOffset && fe <= lineByteEnd) {
              lineFacets.push({
                ...facet,
                index: {
                  byteStart: fs - byteOffset,
                  byteEnd: fe - byteOffset,
                },
              });
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
        content.push({
          type: "bulletList",
          content: block.items.map(leafletListItemToTiptap),
        });
        break;
      }

      case "pub.leaflet.blocks.code": {
        content.push({
          type: "codeBlock",
          attrs: { language: block.lang ?? null },
          content: [{ type: "text", text: block.code }],
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
