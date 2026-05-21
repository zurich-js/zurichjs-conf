import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/atoms';
import {SectionSplitView, SectionSplitViewProps} from "@/components/organisms/SectionSplitView";

export type LearnSectionProps = Partial<SectionSplitViewProps> & {
    title: string;
    subtitle: string;
    items: {
        title: string;
        description: string;
        cta?: {
            label: string;
            href: string;
        };
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
                        <p className="text-brand-gray-medium text-sm flex-1">
                            {item.description}
                        </p>
                        {item.cta ? (
                            <div className="mt-auto flex justify-center pt-1">
                                <Button
                                    href={item.cta.href}
                                    size="xs"
                                    variant="black"
                                    asChild
                                >
                                    <span>{item.cta.label}</span>
                                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                                </Button>
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        </SectionSplitView>
    );
};
