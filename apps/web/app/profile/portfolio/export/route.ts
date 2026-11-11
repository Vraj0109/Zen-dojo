import { connection } from "next/server";
import { renderPortfolioHtml } from "@habit/shared";
import { getPortfolio } from "@/lib/portfolio";

/** Download the portfolio as one self-contained web page (no scripts, no private data). */
export async function GET() {
  await connection();
  const data = await getPortfolio();
  return new Response(renderPortfolioHtml(data), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="zen-dojo-portfolio-${data.generatedOn}.html"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
