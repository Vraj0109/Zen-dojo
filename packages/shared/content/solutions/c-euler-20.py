import math

class Solution:
    def factorialDigitSum(self, n: int) -> int:
        return sum(int(d) for d in str(math.factorial(n)))
