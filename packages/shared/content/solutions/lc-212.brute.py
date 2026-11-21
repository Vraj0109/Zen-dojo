class Solution:
    def findWords(self, board: list[list[str]], words: list[str]) -> list[str]:
        m, n = len(board), len(board[0])

        def dfs(r: int, c: int, word: str, idx: int, visited: list[list[bool]]) -> bool:
            if idx == len(word):
                return True
            if r < 0 or r >= m or c < 0 or c >= n or visited[r][c] or board[r][c] != word[idx]:
                return False

            visited[r][c] = True
            for dr, dc in ((0, 1), (0, -1), (1, 0), (-1, 0)):
                if dfs(r + dr, c + dc, word, idx + 1, visited):
                    visited[r][c] = False
                    return True
            visited[r][c] = False
            return False

        def exists(word: str) -> bool:
            visited = [[False] * n for _ in range(m)]
            for r in range(m):
                for c in range(n):
                    if dfs(r, c, word, 0, visited):
                        return True
            return False

        return [w for w in words if exists(w)]
