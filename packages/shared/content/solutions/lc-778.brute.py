class Solution:
    def swimInWater(self, grid: list[list[int]]) -> int:
        n = len(grid)
        min_time = float('inf')
        visited = [[False] * n for _ in range(n)]

        def dfs(r: int, c: int, current_max: int) -> None:
            nonlocal min_time
            if r == n - 1 and c == n - 1:
                min_time = min(min_time, current_max)
                return
            if current_max >= min_time:
                return

            visited[r][c] = True
            for dr, dc in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < n and 0 <= nc < n and not visited[nr][nc]:
                    dfs(nr, nc, max(current_max, grid[nr][nc]))
            visited[r][c] = False

        dfs(0, 0, grid[0][0])
        return int(min_time)
