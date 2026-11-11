class Solution:
    def hasOddDivisor(self, n: int) -> bool:
        return (n & (n - 1)) != 0
