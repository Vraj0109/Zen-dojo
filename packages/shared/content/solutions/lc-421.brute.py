class Solution:
    def findMaximumXOR(self, nums: list[int]) -> int:
        max_val = 0
        n = len(nums)
        for i in range(n):
            for j in range(i, n):
                val = nums[i] ^ nums[j]
                if val > max_val:
                    max_val = val
        return max_val
