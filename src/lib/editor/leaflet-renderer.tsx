"use client";

import React from "react";
import type {
  LeafletLinearDocument,
  LeafletBlock,
  LeafletFacet,
  LeafletListItem,
  LeafletUnorderedListItem,
} from "@/lib/atproto/project-types";
import { getProjectImageUrl } from "@/lib/atproto/projects";

export interface LeafletRendererProps {
  document: LeafletLinearDocument;
  pdsUrl: string;
  did: string;
  className?: string;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Clamp a byte offset to a valid UTF-8 character boundary.
 * If the offset falls in the middle of a multi-byte sequence (continuation byte 0x80–0xBF),
 * walk back to the start of that sequence to avoid U+FFFD replacement characters.
 * Fix 0sa: prevents mid-sequence slicing.
 */
function clampToCharBoundary(bytes: Uint8Array, offset: number): number {
  let o = Math.max(0, Math.min(offset, bytes.length));
  while (o > 0 && (bytes[o] & 0xc0) === 0x80) {
    o--;
  }
  return o;
}

/**
 * Render faceted text as React nodes, handling UTF-8 byte offsets correctly.
 * Fix y5c: each node pushed to the array gets a unique key based on segment index.
 * Fix 0sa: byte offsets are clamped to character boundaries before slicing.
 */
function renderFacetedText(
  plaintext: string,
  facets?: LeafletFacet[]
): React.ReactNode[] {
  if (!plaintext) return [];
  if (!facets || facets.length === 0) {
    return [plaintext];
  }

  const bytes = encoder.encode(plaintext);
  const totalBytes = bytes.length;

  // Sort facets by byteStart
  const sorted = [...facets].sort(
    (a, b) => a.index.byteStart - b.index.byteStart
  );

  const nodes: React.ReactNode[] = [];
  let cursor = 0; // byte cursor
  let nodeIndex = 0; // unique index for React keys (fix y5c)

  for (let i = 0; i < sorted.length; i++) {
    const facet = sorted[i];
    // Fix 0sa: clamp byte offsets to valid character boundaries
    const byteStart = clampToCharBoundary(bytes, facet.index.byteStart);
    const byteEnd = clampToCharBoundary(bytes, facet.index.byteEnd);

    // Gap before this facet
    if (cursor < byteStart) {
      const safeStart = clampToCharBoundary(bytes, cursor);
      const safeEnd = clampToCharBoundary(bytes, byteStart);
      const gapBytes = bytes.slice(safeStart, safeEnd);
      const gapText = decoder.decode(gapBytes);
      if (gapText) {
        // Fix y5c: wrap in Fragment with unique key so the nodes array has stable keys
        nodes.push(
          <React.Fragment key={`gap-${nodeIndex++}`}>{gapText}</React.Fragment>
        );
      }
    }

    // The faceted segment
    const start = clampToCharBoundary(bytes, Math.max(cursor, byteStart));
    const end = clampToCharBoundary(bytes, Math.min(byteEnd, totalBytes));
    if (start < end) {
      const facetBytes = bytes.slice(start, end);
      const facetText = decoder.decode(facetBytes);

      if (facetText) {
        // Determine what wrapping elements to apply based on features
        // Fix y5c: use a stable unique key combining segment index and feature index
        const facetKey = nodeIndex++;
        let node: React.ReactNode = facetText;

        // Apply features in reverse order (innermost first)
        const reversedFeatures = [...facet.features].reverse();
        for (let fi = 0; fi < reversedFeatures.length; fi++) {
          const feature = reversedFeatures[fi];
          const featureKey = `f${facetKey}-${fi}`;
          switch (feature.$type) {
            case "pub.leaflet.richtext.facet#bold":
              node = <strong key={featureKey}>{node}</strong>;
              break;
            case "pub.leaflet.richtext.facet#italic":
              node = <em key={featureKey}>{node}</em>;
              break;
            case "pub.leaflet.richtext.facet#code":
              node = (
                <code
                  key={featureKey}
                  className="bg-gray-50 px-1 py-0.5 rounded text-sm font-mono"
                >
                  {node}
                </code>
              );
              break;
            case "pub.leaflet.richtext.facet#strikethrough":
              node = <del key={featureKey}>{node}</del>;
              break;
            case "pub.leaflet.richtext.facet#underline":
              node = <u key={featureKey}>{node}</u>;
              break;
            case "pub.leaflet.richtext.facet#highlight":
              node = (
                <mark key={featureKey} className="bg-yellow-100">
                  {node}
                </mark>
              );
              break;
            case "pub.leaflet.richtext.facet#link":
              node = (
                <a
                  key={featureKey}
                  href={feature.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline hover:text-deep transition-colors duration-150"
                >
                  {node}
                </a>
              );
              break;
            default:
              break;
          }
        }

        // Fix y5c: wrap in Fragment with unique key so the nodes array has stable keys
        nodes.push(
          <React.Fragment key={`seg-${facetKey}`}>{node}</React.Fragment>
        );
      }
    }

    cursor = Math.max(cursor, byteEnd);
  }

  // Remaining text after last facet
  if (cursor < totalBytes) {
    const safeStart = clampToCharBoundary(bytes, cursor);
    const remainingBytes = bytes.slice(safeStart);
    const remainingText = decoder.decode(remainingBytes);
    if (remainingText) {
      nodes.push(
        <React.Fragment key={`tail-${nodeIndex++}`}>{remainingText}</React.Fragment>
      );
    }
  }

  return nodes;
}

/**
 * Render a list item (canonical LeafletListItem format).
 */
function renderListItem(
  item: LeafletListItem,
  pdsUrl: string,
  did: string,
  index: number
): React.ReactNode {
  const content = item.content;
  let itemContent: React.ReactNode = null;

  if (content.$type === "pub.leaflet.blocks.text") {
    const text = content.plaintext ?? content.text ?? "";
    itemContent = renderFacetedText(text, content.facets);
  } else if (content.$type === "pub.leaflet.blocks.header") {
    const text = content.plaintext ?? content.text ?? "";
    itemContent = renderFacetedText(text, content.facets);
  } else if (content.$type === "pub.leaflet.blocks.image") {
    const cid = content.image.ref.$link;
    const src = getProjectImageUrl(pdsUrl, did, cid);
    itemContent = (
      <img
        src={src}
        alt={content.alt ?? ""}
        className="max-w-full rounded-lg my-2"
      />
    );
  }

  return (
    <li key={index}>
      {itemContent}
      {item.children && item.children.length > 0 && (
        <ul className="list-disc pl-6 mt-1 space-y-1">
          {item.children.map((child, ci) =>
            renderListItem(child, pdsUrl, did, ci)
          )}
        </ul>
      )}
    </li>
  );
}

/**
 * Render a legacy list item (LeafletUnorderedListItem format).
 */
function renderLegacyListItem(
  item: LeafletUnorderedListItem,
  pdsUrl: string,
  did: string,
  index: number
): React.ReactNode {
  return (
    <li key={index}>
      {renderFacetedText(item.text, item.facets)}
      {item.items && item.items.length > 0 && (
        <ul className="list-disc pl-6 mt-1 space-y-1">
          {item.items.map((child, ci) =>
            renderLegacyListItem(child, pdsUrl, did, ci)
          )}
        </ul>
      )}
    </li>
  );
}

/**
 * Render a single Leaflet block as a React element.
 */
function renderBlock(
  block: LeafletBlock,
  pdsUrl: string,
  did: string,
  index: number
): React.ReactNode {
  switch (block.$type) {
    case "pub.leaflet.blocks.text": {
      // Fix abd: prefer plaintext (canonical) over legacy text field
      const text = block.plaintext ?? block.text ?? "";
      return (
        <p key={index} className="text-body text-gray-700 mb-4">
          {renderFacetedText(text, block.facets)}
        </p>
      );
    }

    case "pub.leaflet.blocks.header": {
      // Fix abd: prefer plaintext (canonical) over legacy text field
      const text = block.plaintext ?? block.text ?? "";
      const level = block.level ?? 1;
      const content = renderFacetedText(text, block.facets);
      const headingClasses: Record<number, string> = {
        1: "text-h1 font-mono text-navy mb-4 mt-6",
        2: "text-h2 font-mono text-navy mb-3 mt-5",
        3: "text-h3 font-mono text-navy mb-3 mt-4",
        4: "text-h4 font-mono text-navy mb-2 mt-4",
        5: "text-h4 font-mono text-navy mb-2 mt-3",
        6: "text-h4 font-mono text-navy mb-2 mt-3",
      };
      const cls = headingClasses[level] ?? headingClasses[1];
      switch (level) {
        case 1:
          return <h1 key={index} className={cls}>{content}</h1>;
        case 2:
          return <h2 key={index} className={cls}>{content}</h2>;
        case 3:
          return <h3 key={index} className={cls}>{content}</h3>;
        case 4:
          return <h4 key={index} className={cls}>{content}</h4>;
        case 5:
          return <h5 key={index} className={cls}>{content}</h5>;
        default:
          return <h6 key={index} className={cls}>{content}</h6>;
      }
    }

    case "pub.leaflet.blocks.image": {
      const cid = block.image.ref.$link;
      const src = getProjectImageUrl(pdsUrl, did, cid);
      const { aspectRatio } = block;
      const paddingBottom = aspectRatio
        ? `${(aspectRatio.height / aspectRatio.width) * 100}%`
        : undefined;

      return (
        <div key={index} className="my-4">
          {paddingBottom ? (
            <div className="relative w-full" style={{ paddingBottom }}>
              <img
                src={src}
                alt={block.alt ?? ""}
                className="absolute inset-0 w-full h-full object-cover rounded-lg"
              />
            </div>
          ) : (
            <img
              src={src}
              alt={block.alt ?? ""}
              className="max-w-full rounded-lg"
            />
          )}
        </div>
      );
    }

    case "pub.leaflet.blocks.blockquote": {
      // Fix abd: prefer plaintext (canonical) over legacy text field
      const text = block.plaintext ?? block.text ?? "";
      return (
        <blockquote
          key={index}
          className="border-l-4 border-accent pl-4 my-4 text-gray-600 italic"
        >
          {renderFacetedText(text, block.facets)}
        </blockquote>
      );
    }

    case "pub.leaflet.blocks.unorderedList": {
      // Support both canonical (children) and legacy (items) formats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const legacyItems = (block as any).items as LeafletUnorderedListItem[] | undefined;
      if (block.children && block.children.length > 0) {
        return (
          <ul key={index} className="list-disc pl-6 my-4 space-y-1 text-gray-700">
            {block.children.map((item, ci) =>
              renderListItem(item, pdsUrl, did, ci)
            )}
          </ul>
        );
      } else if (legacyItems && legacyItems.length > 0) {
        return (
          <ul key={index} className="list-disc pl-6 my-4 space-y-1 text-gray-700">
            {legacyItems.map((item, ci) =>
              renderLegacyListItem(item, pdsUrl, did, ci)
            )}
          </ul>
        );
      }
      return null;
    }

    case "pub.leaflet.blocks.code": {
      // Fix abd: prefer plaintext (canonical) over legacy code field
      const code = block.plaintext ?? block.code ?? "";
      const lang = block.language ?? block.lang;
      return (
        <pre
          key={index}
          className={`bg-navy text-white p-4 rounded my-4 overflow-x-auto font-mono text-sm${lang ? ` language-${lang}` : ""}`}
        >
          <code>{code}</code>
        </pre>
      );
    }

    case "pub.leaflet.blocks.horizontalRule": {
      return (
        <hr key={index} className="border-gray-200 my-6" />
      );
    }

    case "pub.leaflet.blocks.iframe": {
      return (
        <div key={index} className="my-4">
          <iframe
            src={block.url}
            className="w-full rounded-lg"
            style={{ height: block.height ? `${block.height}px` : "400px" }}
            sandbox="allow-scripts allow-same-origin allow-presentation"
            allowFullScreen
            title="Embedded content"
          />
        </div>
      );
    }

    case "pub.leaflet.blocks.website": {
      return (
        <div
          key={index}
          className="my-4 border border-gray-200 rounded-lg overflow-hidden hover:border-accent/40 transition-colors duration-150"
        >
          <a
            href={block.src}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 no-underline"
          >
            {block.title && (
              <p className="font-semibold text-navy text-sm mb-1">
                {block.title}
              </p>
            )}
            {block.description && (
              <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                {block.description}
              </p>
            )}
            <p className="text-accent text-xs font-mono truncate">{block.src}</p>
          </a>
        </div>
      );
    }

    default:
      return null;
  }
}

/**
 * LeafletRenderer renders a LeafletLinearDocument as read-only HTML.
 * It handles all supported block types and byte-indexed facets for inline formatting.
 */
const LeafletRenderer: React.FC<LeafletRendererProps> = ({
  document,
  pdsUrl,
  did,
  className = "",
}) => {
  if (!document || !document.blocks || document.blocks.length === 0) {
    return null;
  }

  return (
    <div className={`leaflet-renderer ${className}`}>
      {document.blocks.map((wrapper, index) =>
        renderBlock(wrapper.block, pdsUrl, did, index)
      )}
    </div>
  );
};

export default LeafletRenderer;
