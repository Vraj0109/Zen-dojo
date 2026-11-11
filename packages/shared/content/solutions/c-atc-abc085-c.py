class Solution:
    def otoshidamaWays(self, n: int, y: int) -> int:
        count = 0
        for a in range(n + 1):
            for b in range(n - a + 1):
                c = n - a - b
                if 10000 * a + 5000 * b + 1000 * c == y:
                    count += 1
        return count
