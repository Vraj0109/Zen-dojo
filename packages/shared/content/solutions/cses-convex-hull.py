from typing import List

# verify: skip-stress
class Solution:
    def convexHull(self, points: List[List[int]]) -> List[List[int]]:
        n = len(points)
        if n <= 2:
            return points

        pts = sorted(points, key=lambda p: (p[0], p[1]))

        def cross(o, a, b):
            return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

        lower = []
        for p in pts:
            while len(lower) >= 2 and cross(lower[-2], lower[-1], p) < 0:
                lower.pop()
            lower.append(p)

        upper = []
        for p in reversed(pts):
            while len(upper) >= 2 and cross(upper[-2], upper[-1], p) < 0:
                upper.pop()
            upper.append(p)

        combined = lower + upper
        combined.sort(key=lambda p: (p[0], p[1]))
        res = []
        for p in combined:
            if not res or res[-1] != p:
                res.append(p)
        return res
