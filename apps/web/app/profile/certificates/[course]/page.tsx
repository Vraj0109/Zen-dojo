import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { certificateId, isCourseComplete, longDate } from "@habit/shared";
import { getPortfolio } from "@/lib/portfolio";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Certificate" };

export default function CertificatePage({ params }: PageProps<"/profile/certificates/[course]">) {
  return (
    <Suspense fallback={null}>
      <Certificate params={params} />
    </Suspense>
  );
}

async function Certificate({ params }: { params: PageProps<"/profile/certificates/[course]">["params"] }) {
  await connection();
  const { course: raw } = await params;
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    notFound();
  }
  const data = await getPortfolio();
  const course = data.courses.find((c) => c.id === id);
  // Certificates only exist for genuinely complete courses.
  if (!course || !isCourseComplete(course) || !course.completedOn) notFound();
  const ref = certificateId(data.name, course.id, course.completedOn);

  return (
    <main className="w-full px-4 py-6 sm:px-6 lg:px-10">
      <style>{`@page { size: A4 landscape; margin: 0; } @media print { body { background: #fff !important; } .no-print { display: none !important; } .cert { border-width: 8px !important; width: 297mm; height: 209mm; min-height: 0 !important; max-width: none !important; } }`}</style>
      <div className="no-print mb-6 flex flex-wrap items-center gap-3">
        <PrintButton />
        <Link href="/profile/portfolio" className="text-sm text-muted hover:text-foreground">
          Back to portfolio
        </Link>
      </div>
      <section className="cert mx-auto flex min-h-[28rem] max-w-5xl flex-col items-center justify-center gap-4 rounded-sm border-[10px] border-double border-accent bg-white p-10 text-center text-neutral-900">
        <svg width="56" height="56" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <circle cx="32" cy="32" r="26" />
          <path d="M20 40c4-14 10-18 24-20-2 14-8 22-24 20Z" />
          <path d="M20 44l12-12" />
        </svg>
        <p className="text-sm uppercase tracking-[0.3em] text-neutral-600">Zen Dojo</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Certificate of completion</h1>
        <p className="text-neutral-600">This certifies that</p>
        <p className="text-3xl font-semibold sm:text-4xl">{data.name}</p>
        <p className="text-neutral-600">has completed</p>
        <p className="max-w-2xl text-2xl font-medium">{course.title}</p>
        <p className="text-neutral-600">on {longDate(course.completedOn)}</p>
        <p className="mt-4 text-xs text-neutral-500">Certificate number {ref}. A self-study record from Zen Dojo, not an accredited qualification.</p>
      </section>
    </main>
  );
}
