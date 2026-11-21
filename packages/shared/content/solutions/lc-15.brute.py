from typing import List

class Solution:
    def threeSum(self, nums: List[int]) -> List[List[int]]:
        n = len(nums)
        unique = set()
        for i in range(n):
            for j in range(i + 1, n):
                for k in range(j + 1, n):
                    if nums[i] + nums[j] + nums[k] == 0:
                        t = tuple(sorted([nums[i], nums[j], nums[k]]))
                        unique.add(t)
        return [list(t) for t in unique]
