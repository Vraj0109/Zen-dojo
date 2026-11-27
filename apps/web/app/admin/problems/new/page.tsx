import { connection } from "next/server";
import { Suspense } from "react";
import type { ContentProblem } from "@habit/shared";
import { requireAdminPage } from "@/lib/auth/admin";
import { getAllPatterns } from "@/lib/content-repo/lookups";
import { isDesktop } from "@/lib/admin-content/write";
import { ProblemEditorClient } from "../[id]/problem-editor-client";

function createEmptyProblem(): ContentProblem {
  return {
    row: {
      id: "",
      title: "",
      difficulty: "easy",
      source: "custom",
      pattern: null,
      kind: "function",
      url: null,
      unordered: false,
      complexity: null,
      constraints: [],
      inputFormatMd: null,
      outputFormatMd: null,
      fn: {
        name: "",
        params: [],
        returns: "int",
      },
      design: null,
      extra: {},
    },
    cases: [],
    hints: [],
    statement: {
      template: "problem",
      sections: [
        {
          id: "sec-statement",
          slot: "statement",
          ord: 0,
          title: null,
          blocks: [
            {
              id: "blk-statement-1",
              ord: 0,
              type: "markdown",
              body: "Write problem description here...",
              caption: null,
              variant: null,
              label: null,
              timeComplexity: null,
              spaceComplexity: null,
              assetId: null,
              code: {},
            },
          ],
        },
      ],
    },
    solution: {
      template: "problem",
      sections: [
        {
          id: "sec-solution",
          slot: "solution",
          ord: 0,
          title: null,
          blocks: [
            {
              id: "blk-solution-1",
              ord: 0,
              type: "code",
              body: "",
              caption: null,
              variant: "optimal",
              label: "Optimal",
              timeComplexity: "O(n)",
              spaceComplexity: "O(1)",
              assetId: null,
              code: { cpp: "" },
            },
          ],
        },
      ],
    },
  };
}

async function NewProblemContainer() {
  await connection();
  await requireAdminPage();

  const patterns = await getAllPatterns();
  const emptyProblem = createEmptyProblem();

  return (
    <ProblemEditorClient
      initialProblem={emptyProblem}
      initialAuditRows={[]}
      patterns={patterns.map((p) => ({ id: p.id, name: p.name }))}
      isDesktop={isDesktop()}
    />
  );
}

export default function NewProblemPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create New Problem</h1>
      </div>
      <Suspense fallback={<div className="h-96 rounded-lg border border-line bg-surface animate-pulse" />}>
        <NewProblemContainer />
      </Suspense>
    </div>
  );
}
