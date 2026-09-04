import React, { useEffect, useId, useRef, useState } from "react";
import { Check, Copy, Info, MapPin } from "lucide-react";

export interface InfotipProps {
  label: string;
  copyText?: string;
  mapHref?: string;
  align?: "center" | "start";
  variant?: "light" | "dark";
  children: React.ReactNode;
}

/** An inline, selectable tooltip for brief contextual information. */
export const Infotip: React.FC<InfotipProps> = ({
  label,
  copyText,
  mapHref,
  align = "center",
  variant = "light",
  children,
}) => {
  const tooltipId = useId();
  const [copied, setCopied] = useState(false);
  const hasActions = Boolean(copyText || mapHref);
  const triggerStyles = variant === "dark"
    ? "border-white/70 text-white"
    : "border-gray-500 text-gray-900";
  const iconStyles = variant === "dark" ? "text-brand-yellow-main" : "text-blue-primary";
  const tooltipPositionStyles = align === "start" ? "left-0" : "left-1/2 -translate-x-1/2";
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    []
  );

  const copyToClipboard = async (): Promise<void> => {
    if (!copyText) return;

    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <span className="group/infotip relative inline-flex align-baseline">
      <button
        type="button"
        aria-controls={copyText ? tooltipId : undefined}
        aria-describedby={copyText ? undefined : tooltipId}
        aria-label={copyText ? `Copy address for ${label}` : undefined}
        onClick={copyText ? () => void copyToClipboard() : undefined}
        className={`inline-flex items-center gap-1 border-b border-dotted focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-primary ${triggerStyles} ${copyText ? "cursor-copy" : "cursor-help"}`}
      >
        <span>{label}</span>
        <Info
          className={`h-3.5 w-3.5 flex-shrink-0 ${iconStyles}`}
          aria-hidden="true"
        />
      </button>
      <span
        id={tooltipId}
        role={hasActions ? "group" : "tooltip"}
        aria-label={hasActions ? `${label} details` : undefined}
        className={`pointer-events-none invisible absolute top-full z-50 w-72 max-w-[calc(100vw-2rem)] pt-2 opacity-0 transition-opacity group-hover/infotip:pointer-events-auto group-hover/infotip:visible group-hover/infotip:opacity-100 group-focus-within/infotip:pointer-events-auto group-focus-within/infotip:visible group-focus-within/infotip:opacity-100 ${tooltipPositionStyles}`}
      >
        <span className="block select-text rounded-lg bg-gray-900 px-4 py-3 text-left text-sm font-normal leading-relaxed text-white shadow-lg [&_a]:text-white [&_a]:underline">
          {children}
          {hasActions && (
            <span className="mt-3 flex flex-wrap gap-2 border-t border-white/20 pt-3">
              {copyText && (
                <button
                  type="button"
                  onClick={() => void copyToClipboard()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/40 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {copied ? "Copied" : "Copy address"}
                </button>
              )}
              {mapHref && (
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/40 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  Open in Google Maps
                </a>
              )}
            </span>
          )}
        </span>
      </span>
    </span>
  );
};
