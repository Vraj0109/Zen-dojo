from typing import List

class Solution:
    def creatingStrings(self, s: str) -> List[str]:
        chars = sorted(s)
        out = []
        used = [False] * len(chars)

        def backtrack(cur: list[str]) -> None:
            if len(cur) == len(chars):
                out.append(''.join(cur))
                return
            for i in range(len(chars)):
                if used[i]:
                    continue
                if i > 0 and chars[i] == chars[i - 1] and not used[i - 1]:
                    continue
                used[i] = True
                cur.append(chars[i])
                backtrack(cur)
                cur.pop()
                used[i] = False

        backtrack([])
        return out
