"use client";

import React, { useCallback, useState } from "react";
import { Copy, Check } from "lucide-react";
import { parseTagKeysFromExpression } from "@/lib/cel/expression-builder";

export interface CelPreviewProps {
  expression: string;
  tagKeys: string[];
}

/**
 * Syntax-highlight a CEL expression using simple regex-based spans.
 * - scope.hasAll / scope.hasAny / scope.has → blue
 * - quoted tag keys → green
 * - operators && || ! → red
 */
function highlightCel(expression: string): React.ReactNode {
  if (!expression) return null;

  // We'll tokenize the expression into segments
  const tokens: { text: string; type: "fn" | "key" | "op" | "plain" }[] = [];

  // Regex to match the different token types (order matters)
  const tokenRe =
    /(scope\.has(?:All|Any)?)|("(?:[^"\\]|\\.)*")|(\&\&|\|\||!)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(expression)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: expression.slice(lastIndex, match.index), type: "plain" });
    }
    if (match[1]) {
      tokens.push({ text: match[1], type: "fn" });
    } else if (match[2]) {
      tokens.push({ text: match[2], type: "key" });
    } else if (match[3]) {
      tokens.push({ text: match[3], type: "op" });
    }
    lastIndex = tokenRe.lastIndex;
  }

  if (lastIndex < expression.length) {
    tokens.push({ text: expression.slice(lastIndex), type: "plain" });
  }

  return tokens.map((tok, i) => {
    switch (tok.type) {
      case "fn":
        return (
          <span key={i} className="text-blue-500">
            {tok.text}
          </span>
        );
      case "key":
        return (
          <span key={i} className="text-green-600">
            {tok.text}
          </span>
        );
      case "op":
        return (
          <span key={i} className="text-red-500">
            {tok.text}
          </span>
        );
      default:
        return <span key={i}>{tok.text}</span>;
    }
  });
}

export function CelPreview({ expression, tagKeys }: CelPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!expression) return;
    try {
      await navigator.clipboard.writeText(expression);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available — silently ignore
    }
  }, [expression]);

  const referencedCount = tagKeys.length > 0
    ? tagKeys.length
    : parseTagKeysFromExpression(expression).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-mid-gray)]">
          CEL Expression
        </span>
        {expression && (
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs font-mono text-[var(--color-mid-gray)] hover:text-[var(--color-accent)] transition-colors duration-150"
            aria-label="Copy CEL expression"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>

      <div className="bg-[var(--color-navy)] rounded-lg px-4 py-3 min-h-[56px] flex items-center">
        {expression ? (
          <code className="font-mono text-sm text-white break-all leading-relaxed">
            {highlightCel(expression)}
          </code>
        ) : (
          <span className="font-mono text-sm text-[var(--color-mid-gray)] italic">
            Select tags to generate a CEL expression
          </span>
        )}
      </div>

      {expression && (
        <div className="text-xs font-mono text-[var(--color-mid-gray)]">
          References {referencedCount} tag{referencedCount !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

export default CelPreview;
