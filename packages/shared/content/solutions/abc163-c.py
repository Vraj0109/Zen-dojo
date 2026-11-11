from typing import List

class Solution:
    def directReports(self, a: List[int]) -> List[int]:
        cnt = [0] * (len(a) + 1)
        for b in a:
            cnt[b - 1] += 1
        return cnt
