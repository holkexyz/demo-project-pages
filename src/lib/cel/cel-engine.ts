/**
 * CEL evaluation wrapper for work scope expressions.
 *
 * Implements a lightweight custom evaluator that handles the subset of CEL
 * used for work scope matching:
 *   - scope.hasAll([...keys])
 *   - scope.hasAny([...keys])
 *   - scope.has("key")
 *   - && (logical AND)
 *   - || (logical OR)
 *   - ! (logical NOT)
 *   - Parenthesized grouping
 */

export interface CelContext {
  scope: {
    tags: string[];
  };
}

export interface CelEvaluationResult {
  matches: boolean;
  details: {
    subExpression: string;
    result: boolean;
    matchedTags: string[];
    missingTags: string[];
  }[];
}

// ---------------------------------------------------------------------------
// Tokenizer / parser helpers
// ---------------------------------------------------------------------------

/**
 * Parse a JSON-style string array literal like ["a","b","c"] and return the
 * string values.
 */
function parseStringArray(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    throw new Error(`Expected array literal, got: ${raw}`);
  }
  const inner = trimmed.slice(1, -1).trim();
  if (inner === "") return [];

  const results: string[] = [];
  // Simple tokeniser: find quoted strings
  const re = /["']([^"']*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner)) !== null) {
    results.push(m[1]);
  }
  return results;
}

/**
 * Parse a single quoted string argument like "key" or 'key'.
 */
function parseStringArg(raw: string): string {
  const trimmed = raw.trim();
  const m = trimmed.match(/^["']([^"']*)["']$/);
  if (!m) throw new Error(`Expected string literal, got: ${raw}`);
  return m[1];
}

// ---------------------------------------------------------------------------
// Atomic expression evaluator
// ---------------------------------------------------------------------------

/**
 * Evaluate a single atomic CEL expression (no top-level && / ||).
 * Handles:
 *   scope.hasAll([...])
 *   scope.hasAny([...])
 *   scope.has("key")
 *   !scope.hasAll([...])
 *   !scope.hasAny([...])
 *   !scope.has("key")
 *   (nested expression) — handled by the caller stripping parens
 */
function evaluateAtom(expr: string, tags: string[]): boolean {
  const e = expr.trim();

  // Negation
  if (e.startsWith("!")) {
    return !evaluateAtom(e.slice(1).trim(), tags);
  }

  // scope.hasAll([...])
  const hasAllMatch = e.match(/^scope\.hasAll\((\[[\s\S]*\])\)$/);
  if (hasAllMatch) {
    const keys = parseStringArray(hasAllMatch[1]);
    return keys.every((k) => tags.includes(k));
  }

  // scope.hasAny([...])
  const hasAnyMatch = e.match(/^scope\.hasAny\((\[[\s\S]*\])\)$/);
  if (hasAnyMatch) {
    const keys = parseStringArray(hasAnyMatch[1]);
    return keys.some((k) => tags.includes(k));
  }

  // scope.has("key")
  const hasMatch = e.match(/^scope\.has\(([\s\S]+)\)$/);
  if (hasMatch) {
    const key = parseStringArg(hasMatch[1]);
    return tags.includes(key);
  }

  throw new Error(`Unrecognised atom: ${e}`);
}

// ---------------------------------------------------------------------------
// Top-level parser: handles &&, ||, parentheses
// ---------------------------------------------------------------------------

/**
 * Tokenise the expression into atoms and operators, respecting parentheses and
 * string literals so we don't split inside them.
 *
 * Returns an array of tokens where each token is either:
 *   { type: "op", value: "&&" | "||" }
 *   { type: "atom", value: string }
 */
type Token =
  | { type: "op"; value: "&&" | "||" }
  | { type: "atom"; value: string };

function tokenise(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let current = "";

  const flush = () => {
    const trimmed = current.trim();
    if (trimmed) {
      tokens.push({ type: "atom", value: trimmed });
    }
    current = "";
  };

  while (i < expr.length) {
    // Skip whitespace between tokens (but not inside atoms)
    if (expr[i] === " " || expr[i] === "\t" || expr[i] === "\n") {
      // Check if next two chars are an operator
      const rest = expr.slice(i).trimStart();
      if (rest.startsWith("&&") || rest.startsWith("||")) {
        // will be handled when we reach the operator chars
      }
      current += expr[i];
      i++;
      continue;
    }

    // String literals — consume whole thing to avoid splitting on operators inside
    if (expr[i] === '"' || expr[i] === "'") {
      const quote = expr[i];
      current += expr[i++];
      while (i < expr.length && expr[i] !== quote) {
        current += expr[i++];
      }
      if (i < expr.length) current += expr[i++]; // closing quote
      continue;
    }

    // Array literals — consume whole [...] block
    if (expr[i] === "[") {
      let depth = 0;
      while (i < expr.length) {
        if (expr[i] === "[") depth++;
        else if (expr[i] === "]") depth--;
        current += expr[i++];
        if (depth === 0) break;
      }
      continue;
    }

    // Parenthesised group — consume whole (...) block
    if (expr[i] === "(") {
      let depth = 0;
      while (i < expr.length) {
        if (expr[i] === "(") depth++;
        else if (expr[i] === ")") depth--;
        current += expr[i++];
        if (depth === 0) break;
      }
      continue;
    }

    // Operators && and ||
    if (expr[i] === "&" && expr[i + 1] === "&") {
      flush();
      tokens.push({ type: "op", value: "&&" });
      i += 2;
      continue;
    }
    if (expr[i] === "|" && expr[i + 1] === "|") {
      flush();
      tokens.push({ type: "op", value: "||" });
      i += 2;
      continue;
    }

    current += expr[i++];
  }
  flush();
  return tokens;
}

/**
 * Evaluate a (possibly compound) CEL expression against the given tags.
 * Handles &&, ||, parentheses, and atoms.
 */
function evaluateExpression(expr: string, tags: string[]): boolean {
  const e = expr.trim();

  // Strip outer parentheses if the whole expression is wrapped
  if (e.startsWith("(") && e.endsWith(")")) {
    // Make sure the parens are balanced and wrap the whole thing
    let depth = 0;
    let wrapsAll = true;
    for (let i = 0; i < e.length - 1; i++) {
      if (e[i] === "(") depth++;
      else if (e[i] === ")") depth--;
      if (depth === 0 && i < e.length - 1) {
        wrapsAll = false;
        break;
      }
    }
    if (wrapsAll) {
      return evaluateExpression(e.slice(1, -1), tags);
    }
  }

  const tokens = tokenise(e);

  if (tokens.length === 0) {
    throw new Error("Empty expression");
  }

  // Single atom
  if (tokens.length === 1) {
    const tok = tokens[0];
    if (tok.type !== "atom") throw new Error("Expected atom");
    const v = tok.value.trim();
    // Could be a parenthesised sub-expression
    if (v.startsWith("(") && v.endsWith(")")) {
      return evaluateExpression(v.slice(1, -1), tags);
    }
    return evaluateAtom(v, tags);
  }

  // Evaluate with operator precedence: && binds tighter than ||
  // First pass: collect values and operators
  const values: boolean[] = [];
  const ops: ("&&" | "||")[] = [];

  for (const tok of tokens) {
    if (tok.type === "op") {
      ops.push(tok.value);
    } else {
      const v = tok.value.trim();
      if (v.startsWith("(") && v.endsWith(")")) {
        values.push(evaluateExpression(v.slice(1, -1), tags));
      } else {
        values.push(evaluateAtom(v, tags));
      }
    }
  }

  if (values.length !== ops.length + 1) {
    throw new Error("Malformed expression: mismatched values and operators");
  }

  // Apply && first (higher precedence)
  const andValues: boolean[] = [values[0]];
  const orOps: boolean[] = [];

  for (let i = 0; i < ops.length; i++) {
    if (ops[i] === "&&") {
      andValues[andValues.length - 1] =
        andValues[andValues.length - 1] && values[i + 1];
    } else {
      orOps.push(andValues[andValues.length - 1]);
      andValues.push(values[i + 1]);
    }
  }
  orOps.push(andValues[andValues.length - 1]);

  return orOps.some(Boolean);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Evaluate a work scope CEL expression against the given context.
 * Returns false on evaluation errors (logs to console.warn).
 */
export function evaluateCel(expression: string, context: CelContext): boolean {
  if (!expression || !expression.trim()) return false;
  try {
    return evaluateExpression(expression, context.scope.tags);
  } catch (err) {
    console.warn("[cel-engine] Evaluation error:", err, "| expression:", expression);
    return false;
  }
}

/**
 * Split an expression on top-level && and || operators to get sub-expressions.
 */
function splitTopLevel(expression: string): { expr: string; op: "&&" | "||" | null }[] {
  const tokens = tokenise(expression);
  const parts: { expr: string; op: "&&" | "||" | null }[] = [];
  let current = "";

  for (const tok of tokens) {
    if (tok.type === "op") {
      if (current.trim()) {
        parts.push({ expr: current.trim(), op: tok.value });
      }
      current = "";
    } else {
      current += (current ? " " : "") + tok.value;
    }
  }
  if (current.trim()) {
    parts.push({ expr: current.trim(), op: null });
  }
  return parts;
}

/**
 * Collect all tag keys referenced in an atom expression.
 */
function tagsInAtom(expr: string): string[] {
  const e = expr.trim().replace(/^!/, "").trim();

  const hasAllMatch = e.match(/^scope\.hasAll\((\[[\s\S]*\])\)$/);
  if (hasAllMatch) return parseStringArray(hasAllMatch[1]);

  const hasAnyMatch = e.match(/^scope\.hasAny\((\[[\s\S]*\])\)$/);
  if (hasAnyMatch) return parseStringArray(hasAnyMatch[1]);

  const hasMatch = e.match(/^scope\.has\(([\s\S]+)\)$/);
  if (hasMatch) return [parseStringArg(hasMatch[1])];

  return [];
}

/**
 * Evaluate a CEL expression and return per-sub-expression breakdown.
 */
export function evaluateCelWithDetails(
  expression: string,
  context: CelContext
): CelEvaluationResult {
  if (!expression || !expression.trim()) {
    return { matches: false, details: [] };
  }

  try {
    const tags = context.scope.tags;
    const parts = splitTopLevel(expression);

    const details = parts.map(({ expr }) => {
      let result = false;
      try {
        result = evaluateExpression(expr, tags);
      } catch {
        result = false;
      }

      const referencedTags = tagsInAtom(expr);
      const matchedTags = referencedTags.filter((k) => tags.includes(k));
      const missingTags = referencedTags.filter((k) => !tags.includes(k));

      return { subExpression: expr, result, matchedTags, missingTags };
    });

    const matches = evaluateExpression(expression, tags);
    return { matches, details };
  } catch (err) {
    console.warn("[cel-engine] evaluateCelWithDetails error:", err);
    return { matches: false, details: [] };
  }
}
