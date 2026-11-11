from typing import List

class Solution:
    def fenceStart(self, h: List[int], k: int) -> int:
        cur_sum = sum(h[:k])
        best = cur_sum
        start = 1
        for i in range(k, len(h)):
            cur_sum += h[i] - h[i - k]
            if cur_sum < best:
                best = cur_sum
                start = i - k + 2
        return start
