import React from "react";
import { Info } from "lucide-react";

export interface InfoBoxProps {
  title: string;
  className?: string;
  children: React.ReactNode;
}

/** A collapsible block for useful detail outside the main reading flow. */
export const InfoBox: React.FC<InfoBoxProps> = ({
  title,
  className = "",
  children,
}) => (
  <details
    className={`group rounded-xl border border-blue-primary/20 bg-blue-primary/5 px-4 py-3 ${className}`}
  >
    <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-primary [&::-webkit-details-marker]:hidden">
      <Info
        className="h-4 w-4 flex-shrink-0 text-blue-primary"
        aria-hidden="true"
      />
      <span>{title}</span>
      <span className="ml-auto text-xs font-medium text-gray-500 group-open:hidden">
        Show
      </span>
      <span className="ml-auto hidden text-xs font-medium text-gray-500 group-open:inline">
        Hide
      </span>
    </summary>
    <div className="mt-[1.5ex] pl-6 text-sm leading-relaxed text-gray-700 [&_a]:text-blue-primary [&_a]:underline [&_a:hover]:text-blue-dark">
      {children}
    </div>
  </details>
);
