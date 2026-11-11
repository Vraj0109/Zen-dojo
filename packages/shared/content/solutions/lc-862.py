# verify: skip-stress
from typing import List
from collections import deque

class Solution:
    def shortestSubarray(self, nums: List[int], k: int) -> int:
        n = len(nums)
        p = [0] * (n + 1)
        for i in range(n):
            p[i + 1] = p[i] + nums[i]
        dq = deque()
        best = n + 1
        for j in range(n + 1):
            while dq and p[j] - p[dq[0]] >= k:
                best = min(best, j - dq.popleft())
            while dq and p[dq[-1]] >= p[j]:
                dq.pop()
            dq.append(j)
        return best if best <= n else -1