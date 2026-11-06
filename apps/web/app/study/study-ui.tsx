import { CONFIDENCE_LABELS, COVERED_CONFIDENCE } from "@habit/shared";

export const fmtDate = (d: string, withYear = false) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}) });
};

/** Five dots: filled up to your confidence; green once covered (4+). */
export function Confidence({ value }: { value: number }) {
  return (
    <span className="whitespace-nowrap text-xs" title={`Confidence: ${CONFIDENCE_LABELS[value]}`} aria-label={`Confidence ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= value ? (value >= COVERED_CONFIDENCE ? "text-cat-dsa" : "text-accent") : "text-line"}>
          ●
        </span>
      ))}
    </span>
  );
}
