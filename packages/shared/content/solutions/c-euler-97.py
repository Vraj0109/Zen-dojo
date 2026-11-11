class Solution:
    def lastDigits(self, a: int, e: int, k: int) -> int:
        M = 10 ** k
        r = pow(2, e, M)
        v = (a % M) * r % M
        return (v + 1) % M
