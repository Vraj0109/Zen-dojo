// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { prerender } from "react-dom/static";
import { DESIGN_DEEP, PROBLEM_MICRO_STEPS, type BuddyTone } from "@habit/shared";
import { DesignDeepView } from "./design-deep";
import { BuddySession } from "./buddy-session";
import { ProblemMicroSteps } from "./problem-micro-steps";
import { designDeepToc, flattenToc } from "./toc-items";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Renders a React tree to static HTML string via React 19 prerender stream. */
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

/** Helper to parse rendered HTML string into a DOM element for textContent and query checks. */
function parseDom(html: string): HTMLElement {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div;
}

describe("System Design Deep: UI render & verification for all 27 designs", () => {
  const designEntries = Object.entries(DESIGN_DEEP);

  it("has exactly 27 system design deep implementations", () => {
    expect(designEntries.length).toBe(27);
  });

  for (const [id, deep] of designEntries) {
    describe(`Design ${id}`, () => {
      let html: string;
      let dom: HTMLElement;

      async function getDom() {
        if (!dom) {
          html = await renderHtml(DesignDeepView({ deep }));
          dom = parseDom(html);
        }
        return { html, dom };
      }

      it("renders to HTML without throwing", async () => {
        const { html } = await getDom();
        expect(html.length).toBeGreaterThan(0);
      });

      it("renders diagrams container and each diagram with caption and source", async () => {
        const { dom } = await getDom();
        const diagramsSection = dom.querySelector("#design-diagrams");
        expect(diagramsSection, `Expected #design-diagrams in ${id}`).not.toBeNull();
        expect(deep.diagrams.length).toBeGreaterThanOrEqual(3);

        const sectionText = diagramsSection!.textContent || "";
        for (const diagram of deep.diagrams) {
          expect(sectionText).toContain(diagram.title);
          if (diagram.caption) {
            expect(sectionText).toContain(diagram.caption);
          }
        }
      });

      const arch = deep.architecture;
      if (arch && arch.length > 0) {
        it("renders architecture explorer cards with job, scale, and failure details", async () => {
          const { dom } = await getDom();
          const archSection = dom.querySelector("#design-architecture");
          expect(archSection, `Expected #design-architecture in ${id}`).not.toBeNull();
          expect(archSection!.textContent).toContain("Architecture explorer");

          const archText = archSection!.textContent || "";
          for (const block of arch) {
            expect(block.name.length).toBeGreaterThan(0);
            expect(block.role.length).toBeGreaterThan(0);
            expect(block.scale.length).toBeGreaterThan(0);
            expect(block.failure.length).toBeGreaterThan(0);

            expect(archText).toContain(block.name);
            expect(archText).toContain(block.role);
            expect(archText).toContain(block.scale);
            expect(archText).toContain(block.failure);
          }
        });
      }

      const criteria = deep.criteria;
      if (criteria && criteria.length > 0) {
        it("renders scorecard evaluation criteria with strong and weak benchmarks", async () => {
          const { dom } = await getDom();
          const criteriaSection = dom.querySelector("#design-criteria");
          expect(criteriaSection, `Expected #design-criteria in ${id}`).not.toBeNull();
          expect(criteriaSection!.textContent).toContain("How you will be judged");

          const criteriaText = criteriaSection!.textContent || "";
          for (const criterion of criteria) {
            expect(criterion.area.length).toBeGreaterThan(0);
            expect(criterion.strong.length).toBeGreaterThan(0);
            expect(criterion.weak.length).toBeGreaterThan(0);

            expect(criteriaText).toContain(criterion.area);
            expect(criteriaText).toContain(criterion.strong);
            expect(criteriaText).toContain(criterion.weak);
          }
        });
      }

      it("renders why it is built this way sections with anchored headings", async () => {
        const { dom } = await getDom();
        const depthSection = dom.querySelector("#design-depth");
        expect(depthSection, `Expected #design-depth in ${id}`).not.toBeNull();
        expect(depthSection!.textContent).toContain("Why it is built this way");
        expect(deep.sections.length).toBeGreaterThanOrEqual(1);

        const depthText = depthSection!.textContent || "";
        for (const section of deep.sections) {
          expect(depthText).toContain(section.title);
          const firstParagraph = section.body.split("\n\n")[0]?.trim();
          if (firstParagraph && firstParagraph.length > 20) {
            expect(depthText).toContain(firstParagraph.slice(0, 40));
          }
        }
      });

      const code = deep.code;
      if (code && code.length > 0) {
        it("renders runnable Java code parts and file labels", async () => {
          const { dom } = await getDom();
          const codeSection = dom.querySelector("#design-code");
          expect(codeSection, `Expected #design-code in ${id}`).not.toBeNull();
          expect(codeSection!.textContent).toContain("Key parts in Java");

          const codeText = codeSection!.textContent || "";
          for (const c of code) {
            expect(c.name).toMatch(/\.java$/);
            expect(codeText).toContain(c.name);
            expect(codeText).toMatch(/class|public|static|void/);
          }
        });
      }
    });
  }
});

describe("System Design Deep: Table of Contents alignment (designDeepToc)", () => {
  for (const [id, deep] of Object.entries(DESIGN_DEEP)) {
    it(`${id}: all TOC items and sub-items match rendered section anchor IDs`, async () => {
      const html = await renderHtml(DesignDeepView({ deep }));
      const dom = parseDom(html);
      const toc = designDeepToc(deep);
      const tocIds = flattenToc(toc);

      // Verify every TOC entry corresponds to an actual element id rendered on the page
      expect(tocIds.length).toBeGreaterThan(0);
      for (const anchorId of tocIds) {
        const el = dom.querySelector(`#${anchorId}`);
        expect(el, `Expected anchor id="#${anchorId}" to be present in rendered DOM for ${id}`).not.toBeNull();
      }

      // Verify top-level TOC entry IDs align with structural sections
      const topIds = toc.map((t) => t.id);
      expect(topIds).toContain("design-diagrams");
      expect(topIds).toContain("design-depth");
      if (deep.architecture && deep.architecture.length > 0) {
        expect(topIds).toContain("design-architecture");
      }
      if (deep.criteria && deep.criteria.length > 0) {
        expect(topIds).toContain("design-criteria");
      }
      if (deep.code && deep.code.length > 0) {
        expect(topIds).toContain("design-code");
      }

      // Verify deep sections TOC children match the depth section count and titles
      const depthTocEntry = toc.find((t) => t.id === "design-depth");
      expect(depthTocEntry?.children?.length).toBe(deep.sections.length);
      for (let i = 0; i < deep.sections.length; i++) {
        expect(depthTocEntry?.children?.[i]?.title).toBe(deep.sections[i].title);
      }
    });
  }
});

describe("ADHD Buddy session drawer: UI states and personas", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    return () => {
      container.remove();
    };
  });

  it("returns null when buddy mode is off", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(BuddySession, { settings: { mode: "off", name: "Buddy", pacing: "gentle" }, open: true, onClose: () => {}, style: {} }));
    });
    expect(container.innerHTML).toBe("");
    await act(async () => {
      root.unmount();
    });
  });

  it("renders nothing while the panel is closed", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(BuddySession, { settings: { mode: "coach", name: "Coach Kira", pacing: "gentle" }, open: false, onClose: () => {}, style: {} }));
    });
    expect(container.innerHTML).toBe("");
    await act(async () => {
      root.unmount();
    });
  });

  it("opens an idle session straight to the check-in with the persona name", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(BuddySession, { settings: { mode: "coach", name: "Coach Kira", pacing: "gentle" }, open: true, onClose: () => {}, style: {} }));
    });
    expect(container.textContent).toContain("Sprint Check-in");
    expect(container.textContent).toContain("Coach Kira:");
    await act(async () => {
      root.unmount();
    });
  });

  it("renders intent declaration modal with duration presets and goal input", async () => {
    localStorage.setItem(
      "habit-buddy-session",
      JSON.stringify({ status: "intent", goal: "", startedAt: null, durationMinutes: 20 })
    );
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(BuddySession, { settings: { mode: "calm", name: "Spark", pacing: "gentle" }, open: true, onClose: () => {}, style: {} }));
    });

    expect(container.textContent).toContain("Sprint Check-in");
    expect(container.textContent).toContain("Start sprint");
    expect(container.textContent).toContain("15m");
    expect(container.textContent).toContain("20m");
    expect(container.textContent).toContain("25m");
    expect(container.textContent).toContain("45m");

    const input = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.placeholder).toContain("e.g. Understand 2 examples");

    await act(async () => {
      root.unmount();
    });
  });

  it("renders active co-working sprint with timer, goal, and prompt actions", async () => {
    const startTime = Date.now() - 3 * 60 * 1000;
    localStorage.setItem(
      "habit-buddy-session",
      JSON.stringify({
        status: "active",
        goal: "Deconstruct sliding window edge cases",
        startedAt: startTime,
        durationMinutes: 20,
      })
    );
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(BuddySession, { settings: { mode: "peer", name: "Alex", pacing: "gentle" }, open: true, onClose: () => {}, style: {} }));
    });

    expect(container.textContent).toContain("With Alex");
    expect(container.textContent).toContain("Deconstruct sliding window edge cases");
    expect(container.textContent).toContain("elapsed");
    expect(container.textContent).toContain("Ask Alex");
    expect(container.textContent).toContain("Finish sprint");

    await act(async () => {
      root.unmount();
    });
  });

  it("renders sprint completion reflection state with celebration dialogue and outcome buttons", async () => {
    localStorage.setItem(
      "habit-buddy-session",
      JSON.stringify({
        status: "reflection",
        goal: "Finish tree traversal",
        startedAt: Date.now() - 15 * 60 * 1000,
        durationMinutes: 15,
        completedAt: Date.now(),
      })
    );
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(BuddySession, { settings: { mode: "coach", name: "Sensei", pacing: "gentle" }, open: true, onClose: () => {}, style: {} }));
    });

    expect(container.textContent).toContain("Sprint Complete");
    expect(container.textContent).toContain("Sensei:");
    expect(container.textContent).toContain("Did you hit what you aimed for?");
    expect(container.textContent).toContain("Yes, hit it!");
    expect(container.textContent).toContain("Made progress");

    await act(async () => {
      root.unmount();
    });
  });

  const tones: BuddyTone[] = ["calm", "coach", "peer"];
  for (const tone of tones) {
    it(`renders dialogue correctly across persona: ${tone}`, async () => {
      localStorage.setItem(
        "habit-buddy-session",
        JSON.stringify({ status: "intent", goal: "", startedAt: null, durationMinutes: 20 })
      );
      const root = createRoot(container);
      await act(async () => {
        root.render(React.createElement(BuddySession, { settings: { mode: tone, name: "Guide", pacing: "gentle" }, open: true, onClose: () => {}, style: {} }));
      });

      expect(container.textContent).toContain("Sprint Check-in");
      expect(container.textContent).toContain("Guide:");

      await act(async () => {
        root.unmount();
      });
    });
  }
});

describe("Problem micro-steps deconstruction: UI render & interaction components", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    return () => {
      container.remove();
    };
  });

  it("mounts on DOM and renders header, progress indicator, and all 5 micro-steps", async () => {
    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(ProblemMicroSteps, { problemId: "two-sum" }));
    });

    expect(container.textContent).toContain("Micro-Steps Deconstruction");
    expect(container.textContent).toContain("Lower the activation energy");
    expect(container.textContent).toContain(`0 / ${PROBLEM_MICRO_STEPS.length} done`);

    // Verify all 5 micro-steps from schema are rendered
    expect(PROBLEM_MICRO_STEPS.length).toBe(5);
    for (const step of PROBLEM_MICRO_STEPS) {
      expect(container.textContent).toContain(step.title);
    }

    // Default first step is open and shows prompt and textarea
    expect(container.textContent).toContain("Explain what the problem is asking in 1-2 simple sentences");
    const textarea = container.querySelector("textarea");
    expect(textarea).not.toBeNull();

    await act(async () => {
      root.unmount();
    });
  });

  it("renders persisted checked steps and note content correctly", async () => {
    localStorage.setItem(
      "habit-micro-steps:lru-cache",
      JSON.stringify({
        checked: { 1: true, 2: true },
        notes: { 1: "Keep items in doubly linked list and hash map for O(1) get/put." },
      })
    );

    const root = createRoot(container);
    await act(async () => {
      root.render(React.createElement(ProblemMicroSteps, { problemId: "lru-cache" }));
    });

    expect(container.textContent).toContain("2 / 5 done");
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    expect(textarea.value).toBe("Keep items in doubly linked list and hash map for O(1) get/put.");

    await act(async () => {
      root.unmount();
    });
  });
});
