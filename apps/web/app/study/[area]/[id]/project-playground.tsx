import { ProjectEditor, type ProjectFile } from "../../../components/project-editor";

/**
 * "Playground" section for LLD and System Design study pages: a multi-file Java editor that compiles and runs the
 * project on the local judge. `projectId` keys the saved work in the browser (for example "lld-parking-lot").
 * `files` are the starting files; "Reset Code" restores them.
 */
export function ProjectPlayground({ projectId, files, readOnly = false, noRun = false }: { projectId: string; files: ProjectFile[]; readOnly?: boolean; noRun?: boolean }) {
  return (
    <section aria-labelledby="playground-heading" className="space-y-3">
      <div>
        <h2 id="playground-heading" className="text-lg font-semibold">
          Playground
        </h2>
        <p className="text-sm text-muted">
          {readOnly ? "The reference classes, read-only in reader mode." : "Edit the classes, add your own files, and run the whole project. Your changes are saved in this browser."}
        </p>
      </div>
      <ProjectEditor projectId={projectId} initialFiles={files} readOnly={readOnly} noRun={noRun} />
    </section>
  );
}
