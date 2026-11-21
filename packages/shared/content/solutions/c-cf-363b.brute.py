from typing import List

class Solution:
    def fenceStart(self, h: List[int], k: int) -> int:
        n = len(h)
        best_sum = float('inf')
        best_idx = 1
        for i in range(n - k + 1):
            current_sum = sum(h[i:i + k])
            if current_sum < best_sum:
                best_sum = current_sum
                best_idx = i + 1
        return best_idx
