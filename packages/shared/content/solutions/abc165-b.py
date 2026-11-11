class Solution:
    def yearsToReach(self, x: int) -> int:
        b = 100
        years = 0
        while b < x:
            b += b // 100
            years += 1
        return years
