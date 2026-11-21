class Solution:
    def sortColors(self, nums: list[int]) -> list[int]:
        cnt = [0, 0, 0]
        for x in nums:
            cnt[x] += 1
        idx = 0
        for v in range(3):
            for _ in range(cnt[v]):
                nums[idx] = v
                idx += 1
        return nums
