# Expressive mockups (source)

These are the approved mockups for plans 0085-0089, copied from the private design canvas. Each `X<Page>.dc.html` is one
board. They don't open as normal web pages (they need the canvas runtime), so read them as specs:

- The markup between `<x-dc>` and `</x-dc>` is the layout. `{{name}}` is a value filled in by the script below it.
- The `renderVals()` script holds every style string: exact colours, radii, sizes, gaps and grid rules. `ph` is the
  phone version (390 px wide) and `dk` is dark mode. Sample text and numbers are placeholders; use real data.
- `XRail` (nav rail), `XNavBar` (phone nav bar) and `XAccountMenu` are shared parts that the pages import with
  `<dc-import name="...">`. `XTokens` is the design system board. `XPhones*` only lay out phone frames side by side.

| Board | Plan |
|---|---|
| XTokens, XRail, XAccountMenu, XNavBar | 0085 |
| XPractice, XPattern, XBoss | 0086 |
| XWorkspace | 0087 |
| XToday, XTodayDark, XTodayPhone, XLearn, XCourse, XLesson, XLld, XClasses, XSdDesign, XReading, XDiagrams | 0088 |
| XReview, XRevise, XBacklog, XRoadmap, XProfile, XSettings, XSignIn | 0089 |

The token tables in plan 0085 are the source of truth if a mockup and the plan disagree.
