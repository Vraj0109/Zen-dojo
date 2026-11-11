class Solution:
    def findWords(self, board: List[List[str]], words: List[str]) -> List[str]:
        root = {}
        for w in words:
            cur = root
            for ch in w:
                if ch not in cur:
                    cur[ch] = {}
                cur = cur[ch]
            cur['#'] = w

        rows, cols = len(board), len(board[0])
        result = []

        def dfs(r, c, node):
            if r < 0 or r >= rows or c < 0 or c >= cols:
                return
            cell = board[r][c]
            if cell == '!' or cell not in node:
                return
            next_node = node[cell]
            if '#' in next_node:
                result.append(next_node['#'])
                del next_node['#']
            board[r][c] = '!'
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                dfs(r + dr, c + dc, next_node)
            board[r][c] = cell

        for r in range(rows):
            for c in range(cols):
                dfs(r, c, root)
        return result
