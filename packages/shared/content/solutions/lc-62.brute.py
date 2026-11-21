class Solution:
    def uniquePaths(self, m: int, n: int) -> int:
        def paths(r: int, c: int) -> int:
            if r == m - 1 and c == n - 1:
                return 1
            if r >= m or c >= n:
                return 0
            return paths(r + 1, c) + paths(r, c + 1)
        return paths(0, 0)
