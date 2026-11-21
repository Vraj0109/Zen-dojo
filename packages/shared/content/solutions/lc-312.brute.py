class Solution:
    def maxCoins(self, nums: list[int]) -> int:
        def max_coins_rec(arr: tuple) -> int:
            if len(arr) == 2:
                return 0
            best = 0
            for i in range(1, len(arr) - 1):
                coins = arr[i - 1] * arr[i] * arr[i + 1]
                next_arr = arr[:i] + arr[i + 1:]
                best = max(best, coins + max_coins_rec(next_arr))
            return best

        return max_coins_rec((1,) + tuple(nums) + (1,))
