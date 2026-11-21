class Solution:
    def minDistance(self, word1: str, word2: str) -> int:
        def dfs(i: int, j: int) -> int:
            if i == 0:
                return j
            if j == 0:
                return i
            if word1[i - 1] == word2[j - 1]:
                return dfs(i - 1, j - 1)
            return 1 + min(dfs(i - 1, j - 1), dfs(i - 1, j), dfs(i, j - 1))
        return dfs(len(word1), len(word2))
