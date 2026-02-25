/**
 * Extracts a CID string from a blob reference, handling both:
 * - Raw JSON wire format (from public API): { ref: { $link: "bafkrei..." } }
 * - BlobRef class instance (from @atproto/api Agent): ref is a CID object with toString()
 */
export function extractCid(image: unknown): string | null {
  if (!image || typeof image !== "object") return null;
  const obj = image as Record<string, unknown>;

  // Raw JSON wire format: { ref: { $link: "bafkrei..." } }
  if (
    obj.ref &&
    typeof obj.ref === "object" &&
    (obj.ref as Record<string, unknown>).$link
  ) {
    return (obj.ref as Record<string, unknown>).$link as string;
  }

  // BlobRef class: ref is a CID object with toString()
  if (
    obj.ref &&
    typeof (obj.ref as { toString?: unknown }).toString === "function"
  ) {
    const str = String(obj.ref);
    if (str && !str.startsWith("[object")) return str;
  }

  // Direct cid property
  if (typeof obj.cid === "string") return obj.cid;

  return null;
}
