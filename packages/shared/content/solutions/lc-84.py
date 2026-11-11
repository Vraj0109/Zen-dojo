# verify: skip-stress
from typing import List

class Solution:
    def largestRectangleArea(self, heights: List[int]) -> int:
        best = 0
        st = []
        n = len(heights)
        for i in range(n + 1):
            h = 0 if i == n else heights[i]
            while st and heights[st[-1]] > h:
                height = heights[st.pop()]
                left = 0 if not st else st[-1] + 1
                best = max(best, height * (i - left))
            st.append(i)
        return best