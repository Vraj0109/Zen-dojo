import Link from "next/link";
import { certificateCourses, isCourseComplete, longDate, type PortfolioData } from "@habit/shared";
import { ProgressBar, Stat } from "../ui";

/**
 * The portfolio as shown on /profile/portfolio and on the public page /u/<id>.
 * Takes a PortfolioData snapshot (name, numbers, course titles, dates): nothing private ever goes through here.
 * `certificateHref` turns the certificate rows into links (only the owner's own pages pass it).
 */
export function PortfolioView({ data, certificateHref }: { data: PortfolioData; certificateHref?: (courseId: string) => string }) {
  const s = data.solvedByDifficulty;
  const certs = certificateCourses(data.courses);
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight">{data.name}</h2>
        <p className="text-sm text-muted">Interview-prep progress with Zen Dojo, as of {longDate(data.generatedOn)}</p>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Current streak" value={`${data.streak} day${data.streak === 1 ? "" : "s"}`} />
        <Stat label="Best streak" value={`${data.bestStreak} day${data.bestStreak === 1 ? "" : "s"}`} />
        <Stat label="Problems solved" value={String(data.totalSolved)} hint={`${s.easy} easy, ${s.medium} medium, ${s.hard} hard`} />
        <Stat label="Level" value={String(data.level)} hint={`${data.xp} XP`} />
        <Stat label="Plan weeks done" value={`${data.planWeeksDone} / 16`} />
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        <section>
          <h3 className="mb-3 text-lg font-semibold">Courses</h3>
          <ul className="space-y-3 rounded-xl border border-line bg-surface p-4">
            {data.courses.map((c) => (
              <li key={c.id}>
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium">{c.title}</span>
                  <span className="text-muted">
                    {c.done} / {c.total}
                    {isCourseComplete(c) && c.completedOn ? `, completed ${longDate(c.completedOn)}` : ""}
                  </span>
                </div>
                <ProgressBar value={c.done} max={c.total} label={`${c.title} progress`} />
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-3 text-lg font-semibold">Certificates</h3>
          {certs.length === 0 ? (
            <p className="rounded-xl border border-line bg-surface p-4 text-sm text-muted">No completed courses yet. Finish a course and its certificate appears here.</p>
          ) : (
            <ul className="space-y-2">
              {certs.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3 text-sm">
                  <span>
                    <span className="font-medium">{c.title}</span>
                    <span className="text-muted">, completed {longDate(c.completedOn!)}</span>
                  </span>
                  {certificateHref && (
                    <Link href={certificateHref(c.id)} className="rounded-lg border border-line px-3 py-1.5 font-medium hover:bg-background">
                      View certificate
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
