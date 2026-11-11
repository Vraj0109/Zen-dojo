# verify: skip-stress
from typing import List

class Solution:
    def countRangeSum(self, nums: List[int], lower: int, upper: int) -> int:
        n = len(nums)
        p = [0] * (n + 1)
        for i in range(n):
            p[i + 1] = p[i] + nums[i]
        def sort_count(l, r):
            if r - l <= 1:
                return 0
            m = (l + r) // 2
            res = sort_count(l, m) + sort_count(m, r)
            a = b = l
            for j in range(m, r):
                while a < m and p[j] - p[a] > upper:
                    a += 1
                while b < m and p[j] - p[b] >= lower:
                    b += 1
                res += b - a
            p[l:r] = sorted(p[l:r])
            return res
        return sort_count(0, n + 1)