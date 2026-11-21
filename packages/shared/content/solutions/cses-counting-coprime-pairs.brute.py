import math

class Solution:
    def countingCoprimePairs(self, arr: list[int]) -> int:
        n = len(arr)
        count = 0
        for i in range(n):
            for j in range(i + 1, n):
                if math.gcd(arr[i], arr[j]) == 1:
                    count += 1
        return count
