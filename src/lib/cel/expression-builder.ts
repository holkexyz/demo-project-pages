/**
 * CEL expression builder — generates CEL expressions from UI tag selections.
 */

export type ExpressionMode = "must_have_all" | "any_of" | "exclude";

export interface TagSelection {
  key: string;
  mode: ExpressionMode;
}

/**
 * Build a CEL expression from a list of tag selections.
 *
 * Grouping rules:
 *   - must_have_all keys → scope.hasAll(["key1","key2",...])
 *   - any_of keys        → scope.hasAny(["key1","key2",...])
 *   - exclude keys       → !scope.has("key1") && !scope.has("key2") ...
 *
 * Groups are joined with " && ".
 * Returns empty string if no selections.
 */
export function buildCelExpression(selections: TagSelection[]): string {
  if (!selections || selections.length === 0) return "";

  const mustHaveAll: string[] = [];
  const anyOf: string[] = [];
  const exclude: string[] = [];

  for (const sel of selections) {
    switch (sel.mode) {
      case "must_have_all":
        mustHaveAll.push(sel.key);
        break;
      case "any_of":
        anyOf.push(sel.key);
        break;
      case "exclude":
        exclude.push(sel.key);
        break;
    }
  }

  const parts: string[] = [];

  if (mustHaveAll.length > 0) {
    const keys = mustHaveAll.map((k) => `"${k}"`).join(",");
    parts.push(`scope.hasAll([${keys}])`);
  }

  if (anyOf.length > 0) {
    const keys = anyOf.map((k) => `"${k}"`).join(",");
    parts.push(`scope.hasAny([${keys}])`);
  }

  if (exclude.length > 0) {
    const notParts = exclude.map((k) => `!scope.has("${k}")`);
    parts.push(notParts.join(" && "));
  }

  return parts.join(" && ");
}

/**
 * Shortcut: build a must_have_all expression for the given tag keys.
 * Returns scope.hasAll(["key1","key2",...]) or empty string if no keys.
 */
export function buildSimpleCelExpression(tagKeys: string[]): string {
  if (!tagKeys || tagKeys.length === 0) return "";
  const keys = tagKeys.map((k) => `"${k}"`).join(",");
  return `scope.hasAll([${keys}])`;
}

/**
 * Extract all quoted tag keys from a CEL expression.
 * Returns unique keys found (order of first appearance).
 */
export function parseTagKeysFromExpression(expression: string): string[] {
  if (!expression || !expression.trim()) return [];

  const seen = new Set<string>();
  const results: string[] = [];
  const re = /["']([^"']+)["']/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(expression)) !== null) {
    const key = m[1];
    if (!seen.has(key)) {
      seen.add(key);
      results.push(key);
    }
  }

  return results;
}
