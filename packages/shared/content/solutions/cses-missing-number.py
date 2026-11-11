from typing import List

class Solution:
    def missingNumber(self, n: int, nums: List[int]) -> int:
        total = n * (n + 1) // 2
        return total - sum(nums)
