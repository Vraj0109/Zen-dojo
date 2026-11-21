class Solution:
    def countSmaller(self, nums: list[int]) -> list[int]:
        n = len(nums)
        ans = [0] * n
        for i in range(n):
            cnt = 0
            for j in range(i + 1, n):
                if nums[j] < nums[i]:
                    cnt += 1
            ans[i] = cnt
        return ans
