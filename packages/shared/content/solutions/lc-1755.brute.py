class Solution:
    def minAbsDifference(self, nums: list[int], goal: int) -> int:
        n = len(nums)
        best = abs(goal)

        def dfs(idx: int, current_sum: int):
            nonlocal best
            if idx == n:
                best = min(best, abs(current_sum - goal))
                return
            dfs(idx + 1, current_sum)
            dfs(idx + 1, current_sum + nums[idx])

        dfs(0, 0)
        return best
