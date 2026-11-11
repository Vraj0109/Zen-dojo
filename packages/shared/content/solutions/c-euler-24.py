import math

class Solution:
    def kthPermutation(self, n: int, k: int) -> str:
        fact = [1] * (n + 1)
        for i in range(1, n + 1):
            fact[i] = fact[i - 1] * i
        digits = [str(i) for i in range(n)]
        k -= 1
        out = []
        for i in range(n):
            f = fact[n - 1 - i]
            idx = k // f
            out.append(digits.pop(idx))
            k %= f
        return "".join(out)
