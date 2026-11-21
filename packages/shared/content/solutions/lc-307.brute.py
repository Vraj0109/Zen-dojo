from typing import List

class Solution:
    def rangeSumMutable(self, nums: List[int], queries: List[List[int]]) -> List[int]:
        a = list(nums)
        res = []
        for q in queries:
            if q[0] == 1:
                a[q[1]] = q[2]
            else:
                res.append(sum(a[q[1]:q[2] + 1]))
        return res
