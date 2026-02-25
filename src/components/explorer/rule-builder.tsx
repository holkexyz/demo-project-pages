"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { WorkScopeTagListItem } from "@/lib/atproto/work-scope-types";
import { WORK_SCOPE_TAG_KINDS } from "@/lib/atproto/work-scope-types";
import { TagChip } from "@/components/tags/tag-chip";
import {
  buildCelExpression,
  parseTagKeysFromExpression,
  type TagSelection,
  type ExpressionMode,
} from "@/lib/cel/expression-builder";
import { evaluateCel } from "@/lib/cel/cel-engine";

export interface RuleBuilderProps {
  availableTags: WorkScopeTagListItem[];
  onExpressionChange: (expression: string) => void;
  expression: string;
}

type Mode = "visual" | "cel";

const PRESET_RULES = [
  {
    label: "Nature-based restoration with open data",
    expression: `scope.hasAny(["mangrove_restoration","wetland_restoration","forest_regeneration"]) && scope.has("open_data")`,
  },
  {
    label: "Community-led with monitoring",
    expression: `scope.has("community_led") && scope.hasAny(["biodiversity_monitoring","scientific_monitoring"])`,
  },
  {
    label: "All ecosystem projects",
    expression: `scope.hasAny(["mangrove_restoration","wetland_restoration","coral_reef_protection","forest_regeneration","grassland_restoration","urban_greening"])`,
  },
];

const MODE_LABELS: Record<ExpressionMode, string> = {
  must_have_all: "MUST",
  any_of: "ANY",
  exclude: "EXCL",
};

const MODE_CYCLE: ExpressionMode[] = ["must_have_all", "any_of", "exclude"];

const MODE_COLORS: Record<ExpressionMode, string> = {
  must_have_all: "bg-blue-100 text-blue-800 border-blue-300",
  any_of: "bg-green-100 text-green-800 border-green-300",
  exclude: "bg-red-100 text-red-800 border-red-300",
};

/**
 * Syntax-highlight a CEL expression using simple regex-based spans.
 */
function highlightCel(expression: string): React.ReactNode {
  if (!expression) return null;
  const tokens: { text: string; type: "fn" | "key" | "op" | "plain" }[] = [];
  const tokenRe = /(scope\.has(?:All|Any)?)|("(?:[^"\\]|\\.)*")|(\&\&|\|\||!)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(expression)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: expression.slice(lastIndex, match.index), type: "plain" });
    }
    if (match[1]) tokens.push({ text: match[1], type: "fn" });
    else if (match[2]) tokens.push({ text: match[2], type: "key" });
    else if (match[3]) tokens.push({ text: match[3], type: "op" });
    lastIndex = tokenRe.lastIndex;
  }
  if (lastIndex < expression.length) {
    tokens.push({ text: expression.slice(lastIndex), type: "plain" });
  }
  return tokens.map((tok, i) => {
    switch (tok.type) {
      case "fn": return <span key={i} className="text-blue-400">{tok.text}</span>;
      case "key": return <span key={i} className="text-green-400">{tok.text}</span>;
      case "op": return <span key={i} className="text-red-400">{tok.text}</span>;
      default: return <span key={i}>{tok.text}</span>;
    }
  });
}

export function RuleBuilder({ availableTags, onExpressionChange, expression }: RuleBuilderProps) {
  const [mode, setMode] = useState<Mode>("visual");
  const [selections, setSelections] = useState<Map<string, ExpressionMode>>(new Map());
  const [celText, setCelText] = useState(expression);
  const [celValid, setCelValid] = useState<boolean | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync celText when expression changes externally (e.g. preset click)
  useEffect(() => {
    setCelText(expression);
  }, [expression]);

  // When visual selections change, rebuild expression
  const handleTagClick = useCallback(
    (tagKey: string) => {
      setSelections((prev) => {
        const next = new Map(prev);
        if (!next.has(tagKey)) {
          next.set(tagKey, "must_have_all");
        } else {
          const current = next.get(tagKey)!;
          const idx = MODE_CYCLE.indexOf(current);
          const nextMode = MODE_CYCLE[(idx + 1) % MODE_CYCLE.length];
          // Cycling past "exclude" removes the tag
          if (idx === MODE_CYCLE.length - 1) {
            next.delete(tagKey);
          } else {
            next.set(tagKey, nextMode);
          }
        }
        return next;
      });
    },
    []
  );

  // Rebuild CEL expression when selections change
  useEffect(() => {
    const selArray: TagSelection[] = Array.from(selections.entries()).map(
      ([key, selMode]) => ({ key, mode: selMode })
    );
    const expr = buildCelExpression(selArray);
    onExpressionChange(expr);
  }, [selections, onExpressionChange]);

  // CEL editor: debounced validation + propagation
  const handleCelChange = useCallback(
    (value: string) => {
      setCelText(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onExpressionChange(value);
        // Validate by trying to evaluate against a dummy context
        if (!value.trim()) {
          setCelValid(null);
          return;
        }
        try {
          evaluateCel(value, { scope: { tags: [] } });
          // If it didn't throw, check if parseTagKeysFromExpression works
          parseTagKeysFromExpression(value);
          setCelValid(true);
        } catch {
          setCelValid(false);
        }
      }, 300);
    },
    [onExpressionChange]
  );

  const tagCount = parseTagKeysFromExpression(celText).length;

  const tagsByKind = WORK_SCOPE_TAG_KINDS.map((kind) => ({
    kind,
    tags: availableTags.filter((t) => t.value.kind === kind),
  })).filter((g) => g.tags.length > 0);

  return (
    <div className="bg-white border border-[rgba(15,37,68,0.1)] rounded-lg p-6 flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-[var(--color-navy)]">Rule Builder</h2>

      {/* Tab bar */}
      <div className="flex gap-1 bg-[var(--color-off-white)] rounded-md p-1 w-fit">
        {(["visual", "cel"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded text-sm font-mono font-medium transition-colors duration-150 ${
              mode === m
                ? "bg-white text-[var(--color-navy)] shadow-sm"
                : "text-[var(--color-mid-gray)] hover:text-[var(--color-navy)]"
            }`}
          >
            {m === "visual" ? "Visual Builder" : "CEL Editor"}
          </button>
        ))}
      </div>

      {mode === "visual" ? (
        <div className="flex flex-col gap-4">
          {/* Tag groups */}
          {tagsByKind.map(({ kind, tags }) => (
            <div key={kind}>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-mid-gray)] mb-2">
                {kind}
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => {
                  const selMode = selections.get(tag.value.key);
                  const isSelected = selMode !== undefined;
                  return (
                    <div key={tag.value.key} className="flex flex-col items-center gap-0.5">
                      <TagChip
                        tag={tag}
                        selected={isSelected}
                        onClick={() => handleTagClick(tag.value.key)}
                      />
                      {isSelected && (
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${MODE_COLORS[selMode]}`}
                        >
                          {MODE_LABELS[selMode]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {availableTags.length === 0 && (
            <p className="text-sm text-[var(--color-mid-gray)] italic">
              No tags available. Create some tags first.
            </p>
          )}

          {/* Generated expression preview */}
          {expression && (
            <div className="mt-2">
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-mid-gray)] mb-1">
                Generated CEL
              </div>
              <div className="bg-[var(--color-navy)] rounded px-3 py-2">
                <code className="font-mono text-sm text-white break-all leading-relaxed">
                  {highlightCel(expression)}
                </code>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {/* CEL textarea */}
          <textarea
            className="w-full font-mono text-sm border border-[var(--color-light-gray)] rounded-md px-3 py-2 text-[var(--color-navy)] bg-white resize-none focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(96,161,226,0.15)] transition-colors"
            rows={4}
            placeholder={`scope.hasAll(["tag_key"]) && scope.has("other_key")`}
            value={celText}
            onChange={(e) => handleCelChange(e.target.value)}
            spellCheck={false}
          />

          {/* Syntax-highlighted preview */}
          {celText && (
            <div className="bg-[var(--color-navy)] rounded px-3 py-2">
              <code className="font-mono text-sm text-white break-all leading-relaxed">
                {highlightCel(celText)}
              </code>
            </div>
          )}

          {/* Validation feedback */}
          {celText && celValid !== null && (
            <div
              className={`text-xs font-mono ${
                celValid ? "text-green-600" : "text-red-500"
              }`}
            >
              {celValid
                ? `Valid expression referencing ${tagCount} tag${tagCount !== 1 ? "s" : ""}`
                : "Invalid expression"}
            </div>
          )}
        </div>
      )}

      {/* Preset rules */}
      <div className="border-t border-[var(--color-light-gray)] pt-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-mid-gray)] mb-2">
          Example Rules
        </div>
        <div className="flex flex-col gap-2">
          {PRESET_RULES.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                onExpressionChange(preset.expression);
                setCelText(preset.expression);
                // Clear visual selections when a preset is applied
                setSelections(new Map());
              }}
              className="text-left px-3 py-2 rounded border border-[var(--color-light-gray)] hover:border-[var(--color-accent)] hover:bg-[rgba(96,161,226,0.04)] transition-colors duration-150"
            >
              <div className="text-sm font-medium text-[var(--color-navy)]">
                {preset.label}
              </div>
              <div className="font-mono text-xs text-[var(--color-mid-gray)] mt-0.5 break-all">
                {preset.expression}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RuleBuilder;
