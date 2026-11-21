class Solution:
    def shortestSubarray(self, nums: list[int], k: int) -> int:
        n = len(nums)
        best = n + 1
        for i in range(n):
            cur_sum = 0
            for j in range(i, n):
                cur_sum += nums[j]
                if cur_sum >= k:
                    if j - i + 1 < best:
                        best = j - i + 1
                    break
        return best if best <= n else -1
