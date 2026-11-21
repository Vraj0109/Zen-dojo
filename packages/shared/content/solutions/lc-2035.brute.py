class Solution:
    def minimumDifference(self, nums: list[int]) -> int:
        total_len = len(nums)
        total_n = total_len // 2
        total_sum = sum(nums)
        ans = float("inf")

        def dfs(idx: int, count: int, current_sum: int):
            nonlocal ans
            if count == total_n:
                ans = min(ans, abs(total_sum - 2 * current_sum))
                return
            if idx == total_len:
                return
            if count + total_len - idx < total_n:
                return

            # Choose nums[idx]
            dfs(idx + 1, count + 1, current_sum + nums[idx])
            # Do not choose nums[idx]
            dfs(idx + 1, count, current_sum)

        dfs(0, 0, 0)
        return int(ans)
