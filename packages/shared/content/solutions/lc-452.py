# verify: skip-stress
from typing import List

class Solution:
    def findMinArrowShots(self, points: List[List[int]]) -> int:
        points.sort(key=lambda x: x[1])
        arrows = 1
        pos = points[0][1]
        for p in points:
            if p[0] > pos:
                arrows += 1
                pos = p[1]
        return arrows