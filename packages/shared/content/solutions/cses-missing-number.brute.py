from typing import List

class Solution:
    def missingNumber(self, n: int, nums: List[int]) -> int:
        seen = [False] * (n + 1)
        for x in nums:
            seen[x] = True
        for i in range(1, n + 1):
            if not seen[i]:
                return i
        return -1
