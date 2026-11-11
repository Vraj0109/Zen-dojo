# verify: skip-stress
from typing import List

class Solution:
    def findNumberOfLIS(self, nums: List[int]) -> int:
        n = len(nums)
        best = 0
        ans = 0
        length = [1] * n
        cnt = [1] * n
        for i in range(n):
            for j in range(i):
                if nums[j] >= nums[i]:
                    continue
                if length[j] + 1 > length[i]:
                    length[i] = length[j] + 1
                    cnt[i] = cnt[j]
                elif length[j] + 1 == length[i]:
                    cnt[i] += cnt[j]
            best = max(best, length[i])
        for i in range(n):
            if length[i] == best:
                ans += cnt[i]
        return ans