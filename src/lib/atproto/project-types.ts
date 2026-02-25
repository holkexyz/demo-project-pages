import type { BlobRef } from "@atproto/api";

// Re-export BlobRef so existing code importing it from this module continues to work
export type { BlobRef };

export const PROJECT_COLLECTION = "org.hypercerts.claim.collection";

// --- Leaflet linearDocument types (pub.leaflet.pages.linearDocument) ---

// Rich text facet (pub.leaflet.richtext.facet)
export interface LeafletByteSlice {
  byteStart: number;
  byteEnd: number;
}

export type LeafletFacetFeature =
  | { $type: "pub.leaflet.richtext.facet#bold" }
  | { $type: "pub.leaflet.richtext.facet#italic" }
  | { $type: "pub.leaflet.richtext.facet#code" }
  | { $type: "pub.leaflet.richtext.facet#strikethrough" }
  | { $type: "pub.leaflet.richtext.facet#underline" }
  | { $type: "pub.leaflet.richtext.facet#highlight" }
  | { $type: "pub.leaflet.richtext.facet#link"; uri: string }
  | { $type: "pub.leaflet.richtext.facet#didMention"; did: string }
  | { $type: "pub.leaflet.richtext.facet#atMention"; atURI: string }
  | { $type: "pub.leaflet.richtext.facet#id"; id?: string };

export interface LeafletFacet {
  index: LeafletByteSlice;
  features: LeafletFacetFeature[];
}

/** JSON wire-format blob reference (as stored in ATProto records) */
export interface LeafletBlobRef {
  $type: "blob";
  ref: { $link: string };
  mimeType: string;
  size: number;
}

// Block types (pub.leaflet.blocks.*)
export interface LeafletTextBlock {
  $type: "pub.leaflet.blocks.text";
  /** Canonical field name per pub.leaflet.pages.linearDocument spec */
  plaintext?: string;
  /** Legacy field name — kept for backward compatibility with leaflet-serializer */
  text: string;
  facets?: LeafletFacet[];
  textSize?: "default" | "small" | "large";
}

export interface LeafletHeaderBlock {
  $type: "pub.leaflet.blocks.header";
  /** Canonical field name per pub.leaflet.pages.linearDocument spec */
  plaintext?: string;
  /** Legacy field name — kept for backward compatibility with leaflet-serializer */
  text: string;
  facets?: LeafletFacet[];
  level?: number; // 1-6
}

export interface LeafletImageBlock {
  $type: "pub.leaflet.blocks.image";
  image: LeafletBlobRef;
  alt?: string;
  aspectRatio?: { width: number; height: number };
}

export interface LeafletBlockquoteBlock {
  $type: "pub.leaflet.blocks.blockquote";
  /** Canonical field name per pub.leaflet.pages.linearDocument spec */
  plaintext?: string;
  /** Legacy field name — kept for backward compatibility with leaflet-serializer */
  text: string;
  facets?: LeafletFacet[];
}

export interface LeafletListItem {
  content: LeafletTextBlock | LeafletHeaderBlock | LeafletImageBlock;
  children?: LeafletListItem[];
}

/** Legacy list item shape — kept for backward compatibility with leaflet-serializer */
export interface LeafletUnorderedListItem {
  text: string;
  facets?: LeafletFacet[];
  items?: LeafletUnorderedListItem[];
}

export interface LeafletUnorderedListBlock {
  $type: "pub.leaflet.blocks.unorderedList";
  children: LeafletListItem[];
}

export interface LeafletCodeBlock {
  $type: "pub.leaflet.blocks.code";
  /** Canonical field name per pub.leaflet.pages.linearDocument spec — at least one of plaintext/code must be present */
  plaintext?: string;
  /** Legacy field name — kept for backward compatibility; prefer plaintext */
  code?: string;
  language?: string;
  /** Legacy field name — kept for backward compatibility with leaflet-serializer */
  lang?: string;
}

export interface LeafletHorizontalRuleBlock {
  $type: "pub.leaflet.blocks.horizontalRule";
}

export interface LeafletIframeBlock {
  $type: "pub.leaflet.blocks.iframe";
  url: string;
  height?: number;
}

export interface LeafletWebsiteBlock {
  $type: "pub.leaflet.blocks.website";
  src: string;
  title?: string;
  description?: string;
}

export type LeafletBlock =
  | LeafletTextBlock
  | LeafletHeaderBlock
  | LeafletImageBlock
  | LeafletBlockquoteBlock
  | LeafletUnorderedListBlock
  | LeafletCodeBlock
  | LeafletHorizontalRuleBlock
  | LeafletIframeBlock
  | LeafletWebsiteBlock;

export type LeafletBlockAlignment =
  | "pub.leaflet.pages.linearDocument#textAlignLeft"
  | "pub.leaflet.pages.linearDocument#textAlignCenter"
  | "pub.leaflet.pages.linearDocument#textAlignRight"
  | "pub.leaflet.pages.linearDocument#textAlignJustify";

export interface LeafletBlockWrapper {
  block: LeafletBlock;
  alignment?: LeafletBlockAlignment;
}

// The linearDocument itself (pub.leaflet.pages.linearDocument#main)
export interface LeafletLinearDocument {
  $type?: "pub.leaflet.pages.linearDocument";
  id?: string;
  blocks: LeafletBlockWrapper[];
}

// --- Project record (org.hypercerts.claim.collection with type=project) ---

export interface ProjectRecord {
  $type: "org.hypercerts.claim.collection";
  type: "project";
  title: string;
  shortDescription?: string;
  description?: LeafletLinearDocument;
  avatar?:
    | { $type: "org.hypercerts.defs#uri"; uri: string }
    | { $type: "org.hypercerts.defs#smallImage"; image: BlobRef };
  banner?:
    | { $type: "org.hypercerts.defs#uri"; uri: string }
    | { $type: "org.hypercerts.defs#largeImage"; image: BlobRef };
  items: Array<{
    itemIdentifier: { uri: string; cid: string };
    itemWeight?: string;
  }>;
  createdAt: string;
}

export interface ProjectListItem {
  uri: string;
  cid: string;
  rkey: string;
  value: ProjectRecord;
}
