# verify: skip-stress
import math
from typing import List

class Solution:
    def minimumEuclideanDistance(self, points: List[List[int]]) -> int:
        pts = sorted(points, key=lambda p: (p[0], p[1]))
        n = len(pts)
        for i in range(n - 1):
            if pts[i] == pts[i + 1]:
                return 0

        def dist_sq(a, b):
            dx = a[0] - b[0]
            dy = a[1] - b[1]
            return dx * dx + dy * dy

        # Closest pair divide and conquer
        def solve(l: int, r: int) -> int:
            if r - l <= 3:
                d = dist_sq(pts[l], pts[l + 1])
                for i in range(l, r):
                    for j in range(i + 1, r):
                        d = min(d, dist_sq(pts[i], pts[j]))
                pts[l:r] = sorted(pts[l:r], key=lambda p: p[1])
                return d

            mid = (l + r) // 2
            mid_x = pts[mid][0]
            d = min(solve(l, mid), solve(mid, r))

            merged = []
            i, j = l, mid
            while i < mid and j < r:
                if pts[i][1] <= pts[j][1]:
                    merged.append(pts[i])
                    i += 1
                else:
                    merged.append(pts[j])
                    j += 1
            merged.extend(pts[i:mid])
            merged.extend(pts[j:r])
            pts[l:r] = merged

            strip = [p for p in pts[l:r] if (p[0] - mid_x) ** 2 < d]
            for i in range(len(strip)):
                for j in range(i + 1, len(strip)):
                    if (strip[j][1] - strip[i][1]) ** 2 >= d:
                        break
                    d = min(d, dist_sq(strip[i], strip[j]))
            return d

        return solve(0, n)
