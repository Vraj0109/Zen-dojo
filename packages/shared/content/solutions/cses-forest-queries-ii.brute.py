class Solution:
    def forestQueriesII(self, forest: list[str], queries: list[list[int]]) -> list[int]:
        g = [list(row) for row in forest]
        ans = []
        for q in queries:
            if q[0] == 1:
                y, x = q[1] - 1, q[2] - 1
                g[y][x] = '.' if g[y][x] == '*' else '*'
            else:
                y1, x1, y2, x2 = q[1] - 1, q[2] - 1, q[3] - 1, q[4] - 1
                count = 0
                for r in range(y1, y2 + 1):
                    row = g[r]
                    for c in range(x1, x2 + 1):
                        if row[c] == '*':
                            count += 1
                ans.append(count)
        return ans
