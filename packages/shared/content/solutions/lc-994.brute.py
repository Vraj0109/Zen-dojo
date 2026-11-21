class Solution:
    def orangesRotting(self, grid: list[list[int]]) -> int:
        r, c = len(grid), len(grid[0])
        minutes = 0
        dx = [1, -1, 0, 0]
        dy = [0, 0, 1, -1]
        while True:
            rotted_any = False
            next_grid = [row[:] for row in grid]
            for i in range(r):
                for j in range(c):
                    if grid[i][j] == 1:
                        touches_rotten = False
                        for d in range(4):
                            ni, nj = i + dx[d], j + dy[d]
                            if 0 <= ni < r and 0 <= nj < c and grid[ni][nj] == 2:
                                touches_rotten = True
                                break
                        if touches_rotten:
                            next_grid[i][j] = 2
                            rotted_any = True
            if not rotted_any:
                break
            grid = next_grid
            minutes += 1

        for i in range(r):
            for j in range(c):
                if grid[i][j] == 1:
                    return -1
        return minutes
