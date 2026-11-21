class Solution:
    def forestQueries(self, forest: list[str], queries: list[list[int]]) -> list[int]:
        ans = []
        for y1, x1, y2, x2 in queries:
            count = 0
            for r in range(y1 - 1, y2):
                row = forest[r]
                for c in range(x1 - 1, x2):
                    if row[c] == '*':
                        count += 1
            ans.append(count)
        return ans
