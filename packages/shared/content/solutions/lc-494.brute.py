class Solution:
    def findTargetSumWays(self, nums: list[int], target: int) -> int:
        def count_ways(idx: int, cur_sum: int) -> int:
            if idx == len(nums):
                return 1 if cur_sum == target else 0
            return count_ways(idx + 1, cur_sum + nums[idx]) + count_ways(idx + 1, cur_sum - nums[idx])

        return count_ways(0, 0)
