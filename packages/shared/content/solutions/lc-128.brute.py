from typing import List

class Solution:
    def longestConsecutive(self, nums: List[int]) -> int:
        if not nums:
            return 0
        a = sorted(nums)
        max_streak = 1
        current_streak = 1
        for i in range(1, len(a)):
            if a[i] == a[i - 1]:
                continue
            if a[i] == a[i - 1] + 1:
                current_streak += 1
                if current_streak > max_streak:
                    max_streak = current_streak
            else:
                current_streak = 1
        return max_streak
