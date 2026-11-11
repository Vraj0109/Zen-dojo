# verify: skip-stress
from typing import List

class Solution:
    def reversePairs(self, nums: List[int]) -> int:
        def count(a, lo, hi):
            if hi - lo <= 1:
                return 0
            mid = (lo + hi) // 2
            res = count(a, lo, mid) + count(a, mid, hi)
            j = mid
            for i in range(lo, mid):
                while j < hi and a[i] > 2 * a[j]:
                    j += 1
                res += j - mid
            a[lo:hi] = sorted(a[lo:hi])
            return res
        return count(nums, 0, len(nums))