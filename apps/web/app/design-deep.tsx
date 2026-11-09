import type { WalkthroughDeep } from "@habit/shared";
import { ArticleSection, CodeBlock, DeeperSections } from "./learn-blocks";
import { Diagram } from "./diagram";

/**
 * Depth for a system design (plan 0014): its diagrams, the sections that explain the reasoning and the failure modes, and
 * the runnable Java. Sections use the same sub-section ids as lessons (deeper-<slug>), so the table of contents can link
 * to them; build the matching entries with designDeepToc() from toc-items.ts.
 */
export function DesignDeepView({ deep }: { deep: WalkthroughDeep }) {
  return (
    <>
      <ArticleSection id="design-diagrams" title="Diagrams">
        <div className="space-y-6">
          {deep.diagrams.map((d) => (
            <div key={d.title} className="space-y-2">
              <h3 className="text-base font-semibold">{d.title}</h3>
              <Diagram source={d.source} caption={d.caption} />
            </div>
          ))}
        </div>
      </ArticleSection>
      <ArticleSection id="design-depth" title="Why it is built this way">
        <DeeperSections sections={deep.sections} />
      </ArticleSection>
      {deep.code && deep.code.length > 0 && (
        <ArticleSection id="design-code" title="Key parts in Java">
          <div className="space-y-6">
            {deep.code.map((c) => (
              <div key={c.name} className="space-y-2">
                <h3 className="font-mono text-sm font-semibold">{c.name}</h3>
                <CodeBlock code={c.code} lang="Java" />
              </div>
            ))}
          </div>
        </ArticleSection>
      )}
    </>
  );
}
