"use client";

import { Tabs } from "../../../tabs";

export interface PatternTab {
  id: string;
  label: string;
}

export function PatternTabs({
  id,
  tabs,
  currentTab,
}: {
  id: string;
  tabs: readonly PatternTab[];
  currentTab: string;
}) {
  return (
    <Tabs
      tabs={tabs}
      active={currentTab}
      hrefFor={(tId) => (tId === "learn" ? `/dsa/pattern/${id}` : `/dsa/pattern/${id}?tab=${tId}`)}
      label="Pattern sections"
    />
  );
}
