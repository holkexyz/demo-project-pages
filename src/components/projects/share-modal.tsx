"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Copy, Check } from "lucide-react";
import Button from "@/components/ui/button";

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, shareUrl }) => {
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.select();
    }
  }, [isOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select the input text
      if (inputRef.current) {
        inputRef.current.select();
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-white rounded border border-gray-200 shadow-elevation-3 w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2
            id="share-modal-title"
            className="font-mono text-sm font-semibold text-navy uppercase tracking-wider"
          >
            Share this project
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-navy transition-colors duration-150 p-1 rounded"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* URL input + copy button */}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 h-10 border border-gray-200 rounded bg-gray-50 px-3 text-sm text-gray-700 font-mono focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all duration-150"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleCopy}
            className="flex-shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy
              </>
            )}
          </Button>
        </div>

        {/* Success message */}
        {copied && (
          <p className="mt-2 text-xs text-success font-mono">
            Link copied to clipboard!
          </p>
        )}
      </div>
    </div>
  );
};

export default ShareModal;
