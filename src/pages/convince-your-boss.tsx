import React from "react";
import { InfoContentLayout } from "@/components/InfoContentLayout";
import type { InfoPage } from "@/data/info-pages";

const convinceYourBossPage: InfoPage = {
  slug: "convince-your-boss",
  title: "Convince Your Boss",
  description:
    "Everything you need to get your manager on board with attending ZurichJS Conference 2026.",
  kicker: "Get Approval",
  lastUpdated: "January 28, 2026",
  sections: [],
};

const ConvinceYourBossPage: React.FC = () => {
  return <InfoContentLayout page={convinceYourBossPage} />;
};

export default ConvinceYourBossPage;
