class Solution:
    def findNumberOfLIS(self, nums: list[int]) -> int:
        if not nums:
            return 0
        max_len = 0
        count = 0

        def dfs(idx: int, last_val: int, cur_len: int) -> None:
            nonlocal max_len, count
            if idx == len(nums):
                if cur_len > max_len:
                    max_len = cur_len
                    count = 1
                elif cur_len == max_len and cur_len > 0:
                    count += 1
                return

            dfs(idx + 1, last_val, cur_len)
            if cur_len == 0 or nums[idx] > last_val:
                dfs(idx + 1, nums[idx], cur_len + 1)

        dfs(0, 0, 0)
        return count
