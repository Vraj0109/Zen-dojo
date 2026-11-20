import type { LldDeep, LldProject } from "@habit/shared";
import { ArticleSection, DeeperSections } from "../../../learn-blocks";
import { Diagram } from "../../../diagram";
import { ProjectFiles } from "../../learn-ui";
import { RevealCode } from "./reveal-code";

// The parts of an LLD project page, one per tab. They are the sections LldProjectView (study/learn-ui.tsx) used to
// render in one go, split so each tab shows only its own, with the reference code behind a "Reveal" control.

export function LldWalkthroughPart({ deep }: { deep: LldDeep }) {
  return (
    <ArticleSection id="walkthrough" title="Full design walkthrough">
      <DeeperSections sections={deep.walkthrough} />
    </ArticleSection>
  );
}

export function LldDiagramsPart({ deep }: { deep: LldDeep }) {
  return (
    <ArticleSection id="lld-diagrams" title="Diagrams">
      <div className="space-y-2">
        <Diagram source={deep.classDiagram} caption="Class diagram" />
        <Diagram source={deep.sequenceDiagram} caption="Sequence diagram: the main flow" />
        {deep.stateDiagram && <Diagram source={deep.stateDiagram} caption="State diagram" />}
        {(deep.extraDiagrams ?? []).map((d) => (
          <div key={d.title} className="pt-4">
            <h3 className="text-base font-semibold">{d.title}</h3>
            <Diagram source={d.source} caption={d.caption} />
          </div>
        ))}
      </div>
    </ArticleSection>
  );
}

export function LldConcurrencyPart({ deep }: { deep: LldDeep }) {
  if (deep.concurrency.length === 0) return null;
  return (
    <ArticleSection id="concurrency" title="Concurrency">
      <ul className="list-disc space-y-1.5 pl-5 text-sm leading-7">
        {deep.concurrency.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </ArticleSection>
  );
}

/** "The full code (Java 17)": the file list is a summary; the classes stay hidden until the reader opens it. */
export function LldCodePart({ project }: { project: LldProject }) {
  const files = [...project.files, ...(project.tests ?? [])];
  return (
    <ArticleSection id="java-code" title="The full code (Java 17)">
      <p className="mb-3 text-sm text-muted">
        Standard library only. Copy the files into one folder, compile with <code>javac *.java</code> and run <code>java Main</code>. The checks in this app
        compile and run exactly this code.
      </p>
      <RevealCode
        id="reference-code"
        title="Reveal the reference answer"
        names={files.map((f) => f.name)}
        note={`${files.length} Java file${files.length === 1 ? "" : "s"}, hidden until you open it. Try it yourself first.`}
      >
        <ProjectFiles files={files} />
      </RevealCode>
    </ArticleSection>
  );
}
