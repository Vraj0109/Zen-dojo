// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as React from "react";
import { prerender } from "react-dom/static";
import { DsaRoadmapSkeleton, RoadmapSkeleton } from "./components/roadmap-skeleton";
import { StudyArticleSkeleton, StudyHubSkeleton, StudyAreaSkeleton } from "./components/study-skeleton";
import { ReviewQueueSkeleton } from "./components/review-skeleton";
import { ProfileStatsSkeleton, ProfileSettingsSkeleton } from "./components/profile-skeleton";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderHtml(element: React.ReactNode): Promise<string> {
  const { prelude } = await prerender(element);
  const reader = prelude.getReader();
  let html = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    html += new TextDecoder().decode(value);
  }
  return html;
}

describe("Skeletons (Roadmap, Study, Review, Profile)", () => {
  it("renders DsaRoadmapSkeleton with aria status and pulse elements", async () => {
    const html = await renderHtml(React.createElement(DsaRoadmapSkeleton));
    expect(html).toContain('role="status"');
    expect(html).toContain("animate-pulse");
    expect(html).toContain("bg-line/60");
  });

  it("renders RoadmapSkeleton", async () => {
    const html = await renderHtml(React.createElement(RoadmapSkeleton));
    expect(html).toContain('role="status"');
    expect(html).toContain("animate-pulse");
  });

  it("renders StudyArticleSkeleton with table of contents and code placeholder", async () => {
    const html = await renderHtml(React.createElement(StudyArticleSkeleton));
    expect(html).toContain('role="status"');
    expect(html).toContain("font-mono");
    expect(html).toContain("animate-pulse");
  });

  it("renders StudyHubSkeleton with course grid", async () => {
    const html = await renderHtml(React.createElement(StudyHubSkeleton));
    expect(html).toContain('role="status"');
    expect(html).toContain("animate-pulse");
  });

  it("renders StudyAreaSkeleton with KPI grid", async () => {
    const html = await renderHtml(React.createElement(StudyAreaSkeleton));
    expect(html).toContain('role="status"');
    expect(html).toContain("animate-pulse");
  });

  it("renders ReviewQueueSkeleton with tabs and queue list", async () => {
    const html = await renderHtml(React.createElement(ReviewQueueSkeleton));
    expect(html).toContain('role="status"');
    expect(html).toContain("animate-pulse");
  });

  it("renders ProfileStatsSkeleton and ProfileSettingsSkeleton", async () => {
    const statsHtml = await renderHtml(React.createElement(ProfileStatsSkeleton));
    expect(statsHtml).toContain('role="status"');
    expect(statsHtml).toContain("rounded-full");

    const settingsHtml = await renderHtml(React.createElement(ProfileSettingsSkeleton, { rows: 4 }));
    expect(settingsHtml).toContain('role="status"');
  });
});
