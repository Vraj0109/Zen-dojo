class Solution:
    def slidingWindowMedian(self, nums: list[int], k: int) -> list[int]:
        n = len(nums)
        out = []
        for i in range(n - k + 1):
            window = sorted(nums[i:i + k])
            if k % 2 == 1:
                out.append(2 * window[k // 2])
            else:
                out.append(window[k // 2 - 1] + window[k // 2])
        return out
