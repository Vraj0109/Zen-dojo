from typing import List

class Solution:
    def firstMissingPositive(self, nums: List[int]) -> int:
        seen = set(nums)
        ans = 1
        while ans in seen:
            ans += 1
        return ans
