import type { HTMLAttributes, ReactNode } from "react";

/**
 * Utility to join class names safely.
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base skeleton primitive with pulse animation and Zen Dojo theme line color.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded bg-line/60", className)}
      {...props}
    />
  );
}

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
  lineClassName?: string;
}

const LINE_WIDTHS = [
  "w-full",
  "w-11/12",
  "w-4/5",
  "w-5/6",
  "w-3/4",
  "w-2/3",
  "w-4/5",
  "w-3/5",
];

/**
 * Multi-line text placeholder with varied line widths.
 */
export function SkeletonText({
  lines = 3,
  className,
  lineClassName,
}: SkeletonTextProps) {
  return (
    <div aria-hidden="true" className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => {
        const isLast = i === lines - 1 && lines > 1;
        const widthClass = isLast
          ? "w-3/5"
          : LINE_WIDTHS[i % LINE_WIDTHS.length];
        return (
          <Skeleton
            key={i}
            className={cn("h-4", widthClass, lineClassName)}
          />
        );
      })}
    </div>
  );
}

export interface SkeletonCardProps extends HTMLAttributes<HTMLDivElement> {
  header?: boolean;
  lines?: number;
  children?: ReactNode;
  className?: string;
}

/**
 * Card outline with header and body placeholder bars.
 */
export function SkeletonCard({
  header = true,
  lines = 3,
  children,
  className,
  ...props
}: SkeletonCardProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-xl border border-line bg-surface p-4 space-y-3",
        className
      )}
      {...props}
    >
      {header && (
        <div className="flex items-center justify-between pb-1">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
      )}
      {children ?? <SkeletonText lines={lines} />}
    </div>
  );
}

export interface SkeletonButtonProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "default" | "lg" | "icon";
  className?: string;
}

/**
 * Button placeholder matching Zen Dojo standard heights (h-8 for compact/sm, h-9 for default/md).
 */
export function SkeletonButton({
  size = "default",
  className,
  ...props
}: SkeletonButtonProps) {
  const sizeClasses =
    size === "sm"
      ? "h-8 w-20 rounded-md"
      : size === "icon"
        ? "size-8 rounded-md"
        : size === "lg"
          ? "h-10 w-28 rounded-lg"
          : "h-9 w-24 rounded-lg";

  return (
    <Skeleton
      className={cn("shrink-0", sizeClasses, className)}
      {...props}
    />
  );
}

export interface SkeletonTableProps extends HTMLAttributes<HTMLDivElement> {
  rows?: number;
  columns?: number;
  className?: string;
}

/**
 * Table placeholder with header row and striped/bordered item rows.
 */
export function SkeletonTable({
  rows = 4,
  columns = 3,
  className,
  ...props
}: SkeletonTableProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "overflow-hidden rounded-xl border border-line bg-surface",
        className
      )}
      {...props}
    >
      {/* Header row */}
      <div className="flex items-center gap-4 border-b border-line bg-background/60 p-3">
        {Array.from({ length: columns }).map((_, c) => (
          <Skeleton
            key={c}
            className={cn("h-4", c === 0 ? "w-1/3" : "flex-1")}
          />
        ))}
      </div>
      {/* Body rows */}
      <div className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 p-3.5">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn(
                  "h-3.5",
                  c === 0 ? "w-1/4" : c === columns - 1 ? "w-16" : "flex-1"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
