class Solution:
    def cherryPickup(self, grid: list[list[int]]) -> int:
        n = len(grid)
        memo = {}

        def dp(r1: int, c1: int, r2: int) -> int:
            c2 = r1 + c1 - r2
            if r1 >= n or c1 >= n or r2 >= n or c2 >= n or grid[r1][c1] == -1 or grid[r2][c2] == -1:
                return -10**9
            if r1 == n - 1 and c1 == n - 1:
                return grid[r1][c1]
            state = (r1, c1, r2)
            if state in memo:
                return memo[state]

            cherries = grid[r1][c1]
            if r1 != r2:
                cherries += grid[r2][c2]

            next_max = max(
                dp(r1 + 1, c1, r2 + 1),
                dp(r1 + 1, c1, r2),
                dp(r1, c1 + 1, r2 + 1),
                dp(r1, c1 + 1, r2)
            )

            res = cherries + next_max
            memo[state] = res
            return res

        ans = dp(0, 0, 0)
        return max(0, ans)
