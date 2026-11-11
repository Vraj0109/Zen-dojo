class Solution:
    def trueRating(self, n: int, r: int) -> int:
        return r if n >= 10 else r + 100 * (10 - n)
