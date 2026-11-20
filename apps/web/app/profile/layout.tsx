import { Suspense, type ReactNode } from "react";
import { ProfileHeader } from "./profile-ui";

/*
 * One heading + tab strip for every profile page. A layout is not re-created when you move between its sibling routes,
 * so the tab pill (SlidingPill) keeps its place and slides, and the pages only render their content. It reads no
 * request data: ProfileHeader takes the active tab from usePathname(). The Suspense is for routes with dynamic params
 * (certificates/[course]), where the pathname is not known when the shell is built; that page shows no tabs anyway.
 */
export default function ProfileLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <ProfileHeader />
      </Suspense>
      {children}
    </>
  );
}
