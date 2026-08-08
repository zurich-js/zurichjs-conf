import React, { useId } from "react";
import { Info } from "lucide-react";

export interface InfotipProps {
  label: string;
  children: React.ReactNode;
}

/** An inline, selectable tooltip for brief contextual information. */
export const Infotip: React.FC<InfotipProps> = ({ label, children }) => {
  const tooltipId = useId();

  return (
    <span className="group/infotip relative inline-flex align-baseline">
      <button
        type="button"
        aria-describedby={tooltipId}
        className="inline-flex cursor-help items-center gap-1 border-b border-dotted border-gray-500 text-gray-900 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-primary"
      >
        <span>{label}</span>
        <Info
          className="h-3.5 w-3.5 flex-shrink-0 text-blue-primary"
          aria-hidden="true"
        />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none invisible absolute left-1/2 top-full z-50 w-72 max-w-[calc(100vw-2rem)] -translate-x-1/2 pt-2 opacity-0 transition-opacity group-hover/infotip:pointer-events-auto group-hover/infotip:visible group-hover/infotip:opacity-100 group-focus-within/infotip:pointer-events-auto group-focus-within/infotip:visible group-focus-within/infotip:opacity-100"
      >
        <span className="block select-text rounded-lg bg-gray-900 px-4 py-3 text-left text-sm font-normal leading-relaxed text-white shadow-lg [&_a]:text-white [&_a]:underline">
          {children}
        </span>
      </span>
    </span>
  );
};
