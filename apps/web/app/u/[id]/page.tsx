import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { PortfolioData } from "@habit/shared";
import { getPortfolio } from "@/lib/portfolio";
import { getAiSettings } from "@/lib/ui-prefs";
import { fetchPublicProfile } from "@/lib/public-profile";
import { PageMain } from "../../ui";
import { PortfolioView } from "../portfolio-view";

export const metadata: Metadata = { title: "Portfolio", robots: { index: false } };

/** The public view: takes a snapshot as a prop so the hosted site (plan 0058) can feed it from the server. */
function PublicPortfolio({ data, preview = false, aiEnabled = false }: { data: PortfolioData; preview?: boolean; aiEnabled?: boolean }) {
  return (
    <PageMain title={`${data.name} portfolio`} full>
      {preview && (
        <p className="mb-6 rounded-xl border border-line bg-surface p-3 text-sm text-muted">
          Preview of your public page. Only your name, stats, course titles and dates are shown.
        </p>
      )}
      <PortfolioView data={data} aiEnabled={aiEnabled} />
    </PageMain>
  );
}

export default function PublicPortfolioPage({ params }: PageProps<"/u/[id]">) {
  return (
    <Suspense fallback={null}>
      <Loader params={params} />
    </Suspense>
  );
}

async function Loader({ params }: { params: PageProps<"/u/[id]">["params"] }) {
  await connection();
  const { id } = await params;
  // /u/me is the owner's own preview from local data (desktop only). Any other id is an opt-in snapshot served by the Worker.
  if (id === "me") {
    if (process.env.HABIT_HOSTED === "1") notFound();
    const [data, ai] = await Promise.all([getPortfolio(), getAiSettings()]);
    return <PublicPortfolio data={data} preview aiEnabled={ai.enabled} />;
  }
  const data = await fetchPublicProfile(id);
  if (!data) notFound();
  return <PublicPortfolio data={data} />;
}
