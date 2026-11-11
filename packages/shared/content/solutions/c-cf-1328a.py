class Solution:
    def movesToDivisible(self, a: int, b: int) -> int:
        rem = a % b
        return 0 if rem == 0 else b - rem
