# verify: skip-stress
from typing import List
from collections import defaultdict
import math

class Solution:
    def maxPoints(self, points: List[List[int]]) -> int:
        n = len(points)
        if n <= 2:
            return n
        best = 1
        for i in range(n):
            cnt = defaultdict(int)
            for j in range(i + 1, n):
                dx = points[j][0] - points[i][0]
                dy = points[j][1] - points[i][1]
                g = math.gcd(abs(dx), abs(dy))
                dx //= g
                dy //= g
                if dx < 0 or (dx == 0 and dy < 0):
                    dx = -dx
                    dy = -dy
                cnt[(dx, dy)] += 1
                best = max(best, cnt[(dx, dy)] + 1)
        return best