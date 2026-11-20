-- Per-case list of the latest Submit (JSON, see apps/web/lib/judge/saved-run.ts). Empty for runs saved before it existed.
ALTER TABLE solution_runs ADD COLUMN run_detail TEXT NOT NULL DEFAULT '';
