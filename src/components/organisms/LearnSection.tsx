import React from 'react';
import {SectionSplitView, SectionSplitViewProps} from "@/components/organisms/SectionSplitView";

export type LearnSectionProps = Partial<SectionSplitViewProps> & {
    title: string;
    subtitle: string;
    items: {
        title: string;
        description: string;
    }[]
}

export const LearnSection: React.FC<LearnSectionProps> = ({
    title,
    subtitle,
    items
}) => {
    return (
        <SectionSplitView
            kicker="100x your learning"
            title={title}
            subtitle={subtitle}
            link={{ label: "Need to convince your boss?", href: "/convince-your-boss" }}
            variant="light"
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 lg:pt-10">
                {items.map((item, index) => (
                    <div key={index} className="bg-brand-gray-lightest p-5 rounded-lg flex flex-col gap-4">
                        <h3 className="my-2 text-center font-bold text-lg">{item.title}</h3>
                        <p className="text-brand-gray-medium text-sm">
                            {item.description}
                        </p>
                    </div>
                ))}
            </div>
        </SectionSplitView>
    );
};

