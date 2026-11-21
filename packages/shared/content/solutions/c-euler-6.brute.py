class Solution:
    def sumSquareDifference(self, n: int) -> int:
        total_sum = 0
        sum_sq = 0
        for i in range(1, n + 1):
            total_sum += i
            sum_sq += i * i
        return total_sum * total_sum - sum_sq
