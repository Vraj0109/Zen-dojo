from collections import Counter

class Solution:
    def singleNumber(self, nums: list[int]) -> list[int]:
        cnt = Counter(nums)
        return [k for k, v in cnt.items() if v == 1]
