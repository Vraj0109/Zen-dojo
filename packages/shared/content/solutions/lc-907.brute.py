class Solution:
    def sumSubarrayMins(self, arr: list[int]) -> int:
        MOD = 1_000_000_007
        n = len(arr)
        total = 0
        for i in range(n):
            cur_min = arr[i]
            for j in range(i, n):
                if arr[j] < cur_min:
                    cur_min = arr[j]
                total = (total + cur_min) % MOD
        return total
