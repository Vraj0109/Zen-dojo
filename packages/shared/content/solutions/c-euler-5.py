class Solution:
    def smallestMultiple(self, n: int) -> int:
        from math import gcd
        result = 1
        for i in range(2, n + 1):
            result = result // gcd(result, i) * i
        return result
