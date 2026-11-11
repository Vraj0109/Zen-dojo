from typing import List

class Solution:
    def subsets(self, nums: List[int]) -> List[List[int]]:
        n = len(nums)
        total = 1 << n
        res = []
        for mask in range(total):
            cur = [nums[i] for i in range(n) if (mask & (1 << i))]
            res.append(cur)
        return res
