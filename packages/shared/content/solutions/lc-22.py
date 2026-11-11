from typing import List

class Solution:
    def generateParenthesis(self, n: int) -> List[str]:
        res = []

        def dfs(open_cnt: int, close_cnt: int, cur: list[str]) -> None:
            if len(cur) == 2 * n:
                res.append(''.join(cur))
                return
            if open_cnt < n:
                cur.append('(')
                dfs(open_cnt + 1, close_cnt, cur)
                cur.pop()
            if close_cnt < open_cnt:
                cur.append(')')
                dfs(open_cnt, close_cnt + 1, cur)
                cur.pop()

        dfs(0, 0, [])
        return res
