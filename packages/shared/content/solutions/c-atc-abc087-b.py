class Solution:
    def coinWays(self, a: int, b: int, c: int, x: int) -> int:
        count = 0
        for i in range(a + 1):
            for j in range(b + 1):
                for k in range(c + 1):
                    if 500 * i + 100 * j + 50 * k == x:
                        count += 1
        return count
