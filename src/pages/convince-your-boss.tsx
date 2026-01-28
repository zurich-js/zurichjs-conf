import React from "react";
import { Download } from "lucide-react";
import { InfoContentLayout } from "@/components/InfoContentLayout";
import { Button } from "@/components/atoms/Button";
import type { InfoPage } from "@/data/info-pages";

const convinceYourBossPage: InfoPage = {
  slug: "convince-your-boss",
  title: "Convince Your Boss",
  description:
    "ZurichJS Conf is a JavaScript conference for people who build and run real web applications: frontend, backend, and everything in between.",
  kicker: "With a little help from my community",
  lastUpdated: "January 28, 2026",
  sections: [
    {
      type: "paragraph",
      content:
        "It focuses on the practical side of JavaScript: performance, architecture, maintainability, and the day-to-day decisions that shape products long after they ship.",
    },
    {
      type: "heading",
      level: "h2",
      content: "Why ZurichJS Conf Is Relevant for Full-Stack Teams",
    },
    {
      type: "heading",
      level: "h3",
      content: "Frontend That Holds Up in Production",
    },
    {
      type: "paragraph",
      content:
        "The conference covers modern frontend challenges as they exist in real products. This includes:",
    },
    {
      type: "list",
      items: [
        "Performance and loading behavior in real browsers",
        "Accessibility as part of everyday development",
        "Managing complexity in growing UI codebases",
        "State, architecture, and long-term maintainability",
      ],
    },
    {
      type: "heading",
      level: "h3",
      content: "JavaScript Beyond the Browser",
    },
    {
      type: "paragraph",
      content:
        "ZurichJS Conf treats JavaScript as a full-stack language. Talks cover:",
    },
    {
      type: "list",
      items: [
        "Backend architecture and system boundaries",
        "APIs and data contracts",
        "Performance across the full request lifecycle",
        "Tooling, testing, and reliability",
        "Operating JavaScript systems in production",
      ],
    },
    {
      type: "heading",
      level: "h3",
      content: "Fewer Gaps Between Frontend and Backend",
    },
    {
      type: "paragraph",
      content:
        "Many sessions focus on how frontend and backend choices affect each other. That leads to clearer APIs, fewer integration issues, and better collaboration across teams.",
    },

    // Learn from the People Behind the Work
    {
      type: "heading",
      level: "h2",
      content: "Learn from the People Behind the Work",
    },
    {
      type: "paragraph",
      content:
        "ZurichJS Conf speakers are <strong>experienced engineers who actively build and maintain real systems</strong>. Many of them work on production applications, developer tooling, frameworks, well known tech podcasts and libraries used by teams every day.",
    },
    {
      type: "paragraph",
      content: "What makes this valuable:",
    },
    {
      type: "list",
      items: [
        "Talks are based on real-world constraints, not idealized setups",
        "Speakers share trade-offs and failures",
        "You hear what actually worked and what didn't in production",
      ],
    },
    {
      type: "paragraph",
      content:
        "This means learning directly from people who have already solved problems similar to the ones we face, and understanding the consequences of technical decisions over time.",
    },

    // Direct Access to Leading Voices in the Ecosystem
    {
      type: "heading",
      level: "h2",
      content: "Direct Access to Leading Voices in the Ecosystem",
    },
    {
      type: "paragraph",
      content:
        "ZurichJS Conf is not just about listening to talks — it's about <strong>direct access to the people shaping the tools, practices, and standards of the JavaScript ecosystem</strong>.",
    },
    {
      type: "paragraph",
      content: "Attendees have dedicated opportunities to:",
    },
    {
      type: "list",
      items: [
        "Interact directly with speakers during breaks and social events",
        "Ask in-depth questions about real-world architecture and trade-offs",
        "Get feedback from people who are recognized voices in their stack or field",
        "Build relationships with engineers influencing frameworks, tooling, and best practices",
      ],
    },
    {
      type: "paragraph",
      content:
        "Many speakers are the <strong>main contributors, maintainers, or thought leaders</strong> behind the technologies teams rely on daily. Having direct conversations with them provides context, insights, and perspectives that go far beyond what's possible through talks, blog posts, or documentation alone.",
    },
    {
      type: "paragraph",
      content:
        "This access turns the conference into a high-value knowledge exchange — not just passive learning, but <strong>active engagement with the people defining where the ecosystem is heading</strong>.",
    },

    // Value for the Company
    {
      type: "heading",
      level: "h2",
      content: "Value for the Company",
    },
    {
      type: "list",
      items: [
        "More maintainable codebases",
        "Better performance and reliability",
        "Smarter architectural decisions",
        "Reduced technical debt",
        "Stronger collaboration across frontend and backend",
      ],
    },

    // Knowledge Sharing
    {
      type: "heading",
      level: "h2",
      content: "Knowledge Sharing",
    },
    {
      type: "paragraph",
      content:
        "After the conference, attendees can bring the most relevant insights back to the team with concrete examples, ideas, and improvements we can realistically apply.",
    },

    // Bottom Line
    {
      type: "heading",
      level: "h2",
      content: "Bottom Line",
    },
    {
      type: "paragraph",
      content:
        "ZurichJS Conf helps teams build systems that last across frontend and backend. That's good engineering. And good business.",
    },
  ],
};

const ConvinceYourBossPage: React.FC = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <InfoContentLayout
      page={convinceYourBossPage}
      actions={
        <Button variant="primary" size="sm" onClick={handlePrint}>
          <Download className="w-4 h-4" />
          Download as PDF
        </Button>
      }
    />
  );
};

export default ConvinceYourBossPage;
