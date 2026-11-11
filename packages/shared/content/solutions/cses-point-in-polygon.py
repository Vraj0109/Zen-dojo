from typing import List

class Solution:
    def pointInPolygon(self, polygon: List[List[int]], points: List[List[int]]) -> List[str]:
        n = len(polygon)
        ans = []

        def on_segment(ax: int, ay: int, bx: int, by: int, px: int, py: int) -> bool:
            cp = (bx - ax) * (py - ay) - (by - ay) * (px - ax)
            if cp != 0:
                return False
            return min(ax, bx) <= px <= max(ax, bx) and min(ay, by) <= py <= max(ay, by)

        for px, py in points:
            boundary = False
            crossings = 0

            for i in range(n):
                ax, ay = polygon[i]
                bx, by = polygon[(i + 1) % n]

                if on_segment(ax, ay, bx, by, px, py):
                    boundary = True
                    break

                if ay > by:
                    ax, bx = bx, ax
                    ay, by = by, ay
                if ay <= py < by:
                    cp = (bx - ax) * (py - ay) - (by - ay) * (px - ax)
                    if cp > 0:
                        crossings += 1

            if boundary:
                ans.append("BOUNDARY")
            elif crossings % 2 == 1:
                ans.append("INSIDE")
            else:
                ans.append("OUTSIDE")

        return ans
