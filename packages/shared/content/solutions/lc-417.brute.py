from collections import deque

class Solution:
    def pacificAtlantic(self, heights: list[list[int]]) -> list[list[int]]:
        r, c = len(heights), len(heights[0])
        dx = [1, -1, 0, 0]
        dy = [0, 0, 1, -1]

        def can_reach_pacific(sr: int, sc: int) -> bool:
            vis = set([(sr, sc)])
            q = deque([(sr, sc)])
            while q:
                x, y = q.popleft()
                if x == 0 or y == 0:
                    return True
                for d in range(4):
                    nx, ny = x + dx[d], y + dy[d]
                    if 0 <= nx < r and 0 <= ny < c and (nx, ny) not in vis and heights[nx][ny] <= heights[x][y]:
                        vis.add((nx, ny))
                        q.append((nx, ny))
            return False

        def can_reach_atlantic(sr: int, sc: int) -> bool:
            vis = set([(sr, sc)])
            q = deque([(sr, sc)])
            while q:
                x, y = q.popleft()
                if x == r - 1 or y == c - 1:
                    return True
                for d in range(4):
                    nx, ny = x + dx[d], y + dy[d]
                    if 0 <= nx < r and 0 <= ny < c and (nx, ny) not in vis and heights[nx][ny] <= heights[x][y]:
                        vis.add((nx, ny))
                        q.append((nx, ny))
            return False

        out = []
        for i in range(r):
            for j in range(c):
                if can_reach_pacific(i, j) and can_reach_atlantic(i, j):
                    out.append([i, j])
        return out
