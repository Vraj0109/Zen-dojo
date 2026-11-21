from typing import List

class Solution:
    def largestRectangleArea(self, heights: List[int]) -> int:
        n = len(heights)
        best = 0
        for i in range(n):
            left = i
            while left >= 0 and heights[left] >= heights[i]:
                left -= 1
            right = i
            while right < n and heights[right] >= heights[i]:
                right += 1
            width = right - left - 1
            area = heights[i] * width
            if area > best:
                best = area
        return best
