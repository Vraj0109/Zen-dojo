class Solution:
    def yearsUntilBigger(self, a: int, b: int) -> int:
        years = 0
        while a <= b:
            a *= 3
            b *= 2
            years += 1
        return years
