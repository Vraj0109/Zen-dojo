from typing import List

class Solution:
    def trap(self, height: List[int]) -> int:
        n = len(height)
        water = 0
        for i in range(n):
            left_max = max(height[: i + 1])
            right_max = max(height[i:])
            water += min(left_max, right_max) - height[i]
        return water
