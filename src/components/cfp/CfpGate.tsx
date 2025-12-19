/**
 * CFP Feature Gate Component
 *
 * Wraps CFP pages to check if the CFP feature flag is enabled.
 * Shows a "coming soon" page if the feature is disabled.
 */

import React from 'react';
import Link from 'next/link';
import { SEO } from '@/components/SEO';
import { Heading, Kicker, Logo } from '@/components/atoms';
import { ShapedSection, SiteFooter, SectionContainer } from '@/components/organisms';
import { BackgroundMedia } from '@/components/molecules';
import { footerData } from '@/data';
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
 * Coming soon page shown when CFP is disabled
 */
function CfpComingSoon() {
  return (
    <>
      <SEO
        title="Call for Papers Coming Soon | ZurichJS Conf 2026"
        description="The Call for Papers for ZurichJS Conf 2026 will open soon. Sign up for our newsletter to be notified when submissions open."
        canonical="/cfp"
      />

      <main className="min-h-screen">
        <ShapedSection shape="tighten" variant="dark" dropTop disableContainer>
          <BackgroundMedia
            posterSrc="/images/technopark.png"
            overlayOpacity={0.8}
            fadeOut={true}
          />
          <SectionContainer>
            <div className="relative z-10 my-20">
              <Link href="/">
                <Logo width={180} height={48} />
              </Link>
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              <Kicker className="text-[#F1E271] mb-4">Coming Soon</Kicker>
              <Heading level="h1" className="text-white mb-6 max-w-3xl">
                Call for Papers
              </Heading>
              <p className="text-white/80 text-lg max-w-2xl mb-8">
                The Call for Papers for ZurichJS Conf 2026 will open soon.
                Sign up for our newsletter to be the first to know when submissions open.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <Link
                  href="/"
                  className="px-6 py-3 bg-[#F1E271] text-black font-semibold rounded-lg hover:bg-[#e8d95e] transition-colors"
                >
                  Back to Home
                </Link>
                <Link
                  href="/#newsletter"
                  className="px-6 py-3 border border-white/30 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
                >
                  Get Notified
                </Link>
              </div>

              <div className="mt-16 p-6 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 max-w-md">
                <h3 className="text-white font-semibold mb-2">What to expect</h3>
                <ul className="text-white/70 text-sm text-left space-y-2">
                  <li>• Lightning talks (15 min)</li>
                  <li>• Standard talks (30 min)</li>
                  <li>• Hands-on workshops (2-8 hours)</li>
                  <li>• Speaker travel & accommodation support</li>
                </ul>
              </div>
            </div>
          </SectionContainer>
        </ShapedSection>

        <SiteFooter {...footerData} />
      </main>
    </>
  );
}

/**
 * CFP Gate Component
 *
 * Wraps CFP pages and shows appropriate content based on feature flag status.
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
    return <CfpComingSoon />;
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
