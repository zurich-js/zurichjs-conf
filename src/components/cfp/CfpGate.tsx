/**
 * CFP Feature Gate Component
 *
 * Wraps CFP pages to check if the CFP feature flag is enabled.
 * Shows a 404 page if the feature is disabled.
 */

import React from 'react';
import Custom404 from '@/pages/404';
import { useCfpFeatureFlag } from '@/hooks/useFeatureFlags';

interface CfpGateProps {
  children: React.ReactNode;
}

/**
 * Loading state while checking feature flag
 */
function CfpLoading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F1E271] mx-auto mb-4"></div>
        <p className="text-white/60">Loading...</p>
      </div>
    </div>
  );
}

/**
 * CFP Gate Component
 *
 * Wraps CFP pages and shows appropriate content based on feature flag status.
 * Returns a 404 page if the CFP feature flag is disabled.
 *
 * @example
 * export default function CfpPage() {
 *   return (
 *     <CfpGate>
 *       <ActualPageContent />
 *     </CfpGate>
 *   );
 * }
 */
export function CfpGate({ children }: CfpGateProps) {
  const { isCfpEnabled, isLoading } = useCfpFeatureFlag();

  if (isLoading) {
    return <CfpLoading />;
  }

  if (!isCfpEnabled) {
    return <Custom404 />;
  }

  return <>{children}</>;
}

/**
 * Higher-order component version for wrapping page components
 *
 * @example
 * function MyPage() { return <div>...</div>; }
 * export default withCfpGate(MyPage);
 */
export function withCfpGate<P extends object>(
  WrappedComponent: React.ComponentType<P>
): React.FC<P> {
  const WithCfpGate: React.FC<P> = (props) => {
    return (
      <CfpGate>
        <WrappedComponent {...props} />
      </CfpGate>
    );
  };

  WithCfpGate.displayName = `WithCfpGate(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return WithCfpGate;
}

export default CfpGate;
