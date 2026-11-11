from typing import List

class Solution:
    def potSum(self, nums: List[int]) -> int:
        total = 0
        for x in nums:
            total += (x // 10) ** (x % 10)
        return total
