# verify: skip-stress
from typing import List

class Solution:
    def findingPeriods(self, s: str) -> List[int]:
        n = len(s)
        z = [0] * n
        l = 0
        r = 0
        for i in range(1, n):
            if i <= r:
                z[i] = min(r - i + 1, z[i - l])
            while i + z[i] < n and s[z[i]] == s[i + z[i]]:
                z[i] += 1
            if i + z[i] - 1 > r:
                l = i
                r = i + z[i] - 1

        periods = []
        for p in range(1, n):
            if z[p] >= n - p:
                periods.append(p)
        periods.append(n)
        return periods
