class Solution:
    def shortestBridge(self, grid: list[list[int]]) -> int:
        n = len(grid)
        island1 = []
        island2 = []
        found_first = False

        def dfs(r: int, c: int, island: list[tuple[int, int]]):
            if r < 0 or r >= n or c < 0 or c >= n or grid[r][c] != 1:
                return
            grid[r][c] = 2
            island.append((r, c))
            for dr, dc in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
                dfs(r + dr, c + dc, island)

        for r in range(n):
            for c in range(n):
                if grid[r][c] == 1:
                    if not found_first:
                        dfs(r, c, island1)
                        found_first = True
                    else:
                        dfs(r, c, island2)

        ans = float("inf")
        for r1, c1 in island1:
            for r2, c2 in island2:
                ans = min(ans, abs(r1 - r2) + abs(c1 - c2) - 1)
        return int(ans)
