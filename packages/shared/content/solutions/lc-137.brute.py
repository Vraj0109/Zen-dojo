from collections import Counter

class Solution:
    def singleNumber(self, nums: list[int]) -> int:
        counts = Counter(nums)
        for num, freq in counts.items():
            if freq == 1:
                return num
        return -1
