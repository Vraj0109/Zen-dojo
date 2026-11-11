from typing import List

class Solution:
    def pointLocationTest(self, queries: List[List[int]]) -> List[str]:
        ans = []
        for x1, y1, x2, y2, x3, y3 in queries:
            cross = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1)
            if cross > 0:
                ans.append("LEFT")
            elif cross < 0:
                ans.append("RIGHT")
            else:
                ans.append("TOUCH")
        return ans
