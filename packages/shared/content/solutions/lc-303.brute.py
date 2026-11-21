from typing import List

class Solution:
    def rangeSumQuery(self, nums: List[int], queries: List[List[int]]) -> List[int]:
        res = []
        for l, r in queries:
            res.append(sum(nums[l:r + 1]))
        return res
