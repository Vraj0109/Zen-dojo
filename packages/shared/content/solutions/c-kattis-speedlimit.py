from typing import List

class Solution:
    def calculateTotalDistance(self, logs: List[List[int]]) -> int:
        total = 0
        prev = 0
        for speed, curr in logs:
            total += speed * (curr - prev)
            prev = curr
        return total
