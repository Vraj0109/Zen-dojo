from typing import List

class Solution:
    def maximumSubarraySum(self, arr: List[int]) -> int:
        best = arr[0]
        n = len(arr)
        for i in range(n):
            current_sum = 0
            for j in range(i, n):
                current_sum += arr[j]
                if current_sum > best:
                    best = current_sum
        return best
