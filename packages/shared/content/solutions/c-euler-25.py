class Solution:
    def firstFibWithDigits(self, d: int) -> int:
        if d <= 1:
            return 1
        a, b = 1, 1
        k = 2
        threshold = 10 ** (d - 1)
        while b < threshold:
            a, b = b, a + b
            k += 1
        return k
