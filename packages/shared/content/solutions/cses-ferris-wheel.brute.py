from typing import List

class Solution:
    def ferrisWheel(self, weights: List[int], x: int) -> int:
        weights.sort()
        left = 0
        right = len(weights) - 1
        gondolas = 0
        while left <= right:
            if left < right and weights[left] + weights[right] <= x:
                left += 1
            right -= 1
            gondolas += 1
        return gondolas
