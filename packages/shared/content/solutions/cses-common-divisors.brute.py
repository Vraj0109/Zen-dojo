import math

class Solution:
    def commonDivisors(self, arr: list[int]) -> int:
        n = len(arr)
        max_gcd = 1
        for i in range(n):
            for j in range(i + 1, n):
                g = math.gcd(arr[i], arr[j])
                if g > max_gcd:
                    max_gcd = g
        return max_gcd
