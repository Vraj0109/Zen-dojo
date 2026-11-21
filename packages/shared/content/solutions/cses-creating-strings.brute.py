from typing import List

class Solution:
    def creatingStrings(self, s: str) -> List[str]:
        chars = sorted(s)
        n = len(chars)
        used = [False] * n
        result = []

        def backtrack(curr: List[str]):
            if len(curr) == n:
                result.append("".join(curr))
                return
            for i in range(n):
                if used[i]:
                    continue
                if i > 0 and chars[i] == chars[i - 1] and not used[i - 1]:
                    continue
                used[i] = True
                curr.append(chars[i])
                backtrack(curr)
                curr.pop()
                used[i] = False

        backtrack([])
        return result
