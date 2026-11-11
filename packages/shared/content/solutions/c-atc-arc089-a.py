from typing import List

class Solution:
    def canFollowPlan(self, plan: List[List[int]]) -> bool:
        t = 0
        x = 0
        y = 0
        for p in plan:
            dt = p[0] - t
            d = abs(p[1] - x) + abs(p[2] - y)
            if d > dt or (dt - d) % 2 != 0:
                return False
            t, x, y = p[0], p[1], p[2]
        return True
