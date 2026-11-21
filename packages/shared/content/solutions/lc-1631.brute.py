class Solution:
    def minimumEffortPath(self, heights: list[list[int]]) -> int:
        rows = len(heights)
        cols = len(heights[0])
        min_effort = float('inf')
        visited = [[False] * cols for _ in range(rows)]

        def dfs(r: int, c: int, current_max: int) -> None:
            nonlocal min_effort
            if r == rows - 1 and c == cols - 1:
                min_effort = min(min_effort, current_max)
                return
            if current_max >= min_effort:
                return

            visited[r][c] = True
            for dr, dc in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < rows and 0 <= nc < cols and not visited[nr][nc]:
                    diff = abs(heights[nr][nc] - heights[r][c])
                    dfs(nr, nc, max(current_max, diff))
            visited[r][c] = False

        dfs(0, 0, 0)
        return int(min_effort)
