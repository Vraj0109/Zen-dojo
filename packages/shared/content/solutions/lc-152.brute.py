from typing import List

class Solution:
    def maxProduct(self, nums: List[int]) -> int:
        n = len(nums)
        best = nums[0]
        for i in range(n):
            prod = 1
            for j in range(i, n):
                prod *= nums[j]
                if prod > best:
                    best = prod
                if prod > 10**14 or prod < -10**14:
                    break
        return best
