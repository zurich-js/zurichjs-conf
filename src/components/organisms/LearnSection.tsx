import React from 'react';
import {SectionSplitView, SectionSplitViewProps} from "@/components/organisms/SectionSplitView";

type LearnSectionProps = Partial<SectionSplitViewProps> & {}

export const LearnSection: React.FC<LearnSectionProps> = ({
    title,
    subtitle,
}) => {
    return (
        <SectionSplitView
            kicker="Schedule"
            title={title}
            subtitle={subtitle}
            variant="light"
        >
            <div className="flex flex-col gap-6 pt-8">
                <div className="flex flex-col sm:flex-row gap-6 [&>*]:flex-1 lg:pt-2.5">
                    <div className="bg-brand-gray-lightest p-5 rounded-lg flex flex-col gap-4">
                        <h3 className="text-center font-bold text-md">Learn from industry experts</h3>
                        <p className="text-brand-gray-medium text-sm">
                            Presented by the likes of Daniel Roe (Nuxt project lead and regex lover), Scott Tolinski (Host of Syntax.fm) [.....etc],
                        </p>
                    </div>
                    <div className="bg-brand-gray-lightest p-5 rounded-lg flex flex-col gap-4">
                        <h3 className="text-center font-bold text-md">Get hands-on with workshops</h3>
                        <p className="text-brand-gray-medium text-sm">
                            Enough talk, let’s build! For those specific use-cases that require a deeper dive than possible on stage. Get expertise and ask questions for the best possible learning.
                        </p>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-6 [&>*]:flex-1">
                    <div className="bg-brand-gray-lightest p-5 rounded-lg flex flex-col gap-4">
                        <h3 className="text-center font-bold text-md">Connect with your community</h3>
                        <p className="text-brand-gray-medium text-sm">
                            Connect with the amazing ZurichJS community, make friends, professionally network, and create long-lasting connections across borders.
                        </p>
                    </div>
                    <div className="bg-brand-gray-lightest p-5 rounded-lg flex flex-col gap-4">
                        <h3 className="text-center font-bold text-md">... at an affordable price</h3>
                        <p className="text-brand-gray-medium text-sm">
                            In Switzerland! What?<br/>
                            That’s right. You get the community pricing, up to 50% lower than other European conferences in the web dev space.
                        </p>
                    </div>
                </div>
            </div>
        </SectionSplitView>
    );
};

