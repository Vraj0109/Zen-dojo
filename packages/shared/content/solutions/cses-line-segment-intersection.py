from typing import List

class Solution:
    def lineSegmentIntersection(self, queries: List[List[int]]) -> List[str]:
        def sign(v: int) -> int:
            return 1 if v > 0 else (-1 if v < 0 else 0)

        def cross(ax: int, ay: int, bx: int, by: int, cx: int, cy: int) -> int:
            return sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax))

        def on_segment(ax: int, ay: int, bx: int, by: int, px: int, py: int) -> bool:
            return min(ax, bx) <= px <= max(ax, bx) and min(ay, by) <= py <= max(ay, by)

        ans = []
        for x1, y1, x2, y2, x3, y3, x4, y4 in queries:
            o1 = cross(x1, y1, x2, y2, x3, y3)
            o2 = cross(x1, y1, x2, y2, x4, y4)
            o3 = cross(x3, y3, x4, y4, x1, y1)
            o4 = cross(x3, y3, x4, y4, x2, y2)

            if o1 != o2 and o3 != o4:
                ans.append("YES")
            elif o1 == 0 and on_segment(x1, y1, x2, y2, x3, y3):
                ans.append("YES")
            elif o2 == 0 and on_segment(x1, y1, x2, y2, x4, y4):
                ans.append("YES")
            elif o3 == 0 and on_segment(x3, y3, x4, y4, x1, y1):
                ans.append("YES")
            elif o4 == 0 and on_segment(x3, y3, x4, y4, x2, y2):
                ans.append("YES")
            else:
                ans.append("NO")
        return ans
