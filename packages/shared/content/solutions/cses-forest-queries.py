from typing import List

class Solution:
    def forestQueries(self, forest: List[str], queries: List[List[int]]) -> List[int]:
        n = len(forest)
        p = [[0] * (n + 1) for _ in range(n + 1)]
        for i in range(1, n + 1):
            row = forest[i - 1]
            p_i = p[i]
            p_prev = p[i - 1]
            for j in range(1, n + 1):
                tree = 1 if row[j - 1] == '*' else 0
                p_i[j] = tree + p_prev[j] + p_i[j - 1] - p_prev[j - 1]

        ans = []
        for y1, x1, y2, x2 in queries:
            ans.append(p[y2][x2] - p[y1 - 1][x2] - p[y2][x1 - 1] + p[y1 - 1][x1 - 1])
        return ans
