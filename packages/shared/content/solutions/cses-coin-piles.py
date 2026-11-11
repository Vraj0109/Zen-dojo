class Solution:
    def coinPiles(self, a: int, b: int) -> bool:
        if (a + b) % 3 != 0:
            return False
        return a <= 2 * b and b <= 2 * a
