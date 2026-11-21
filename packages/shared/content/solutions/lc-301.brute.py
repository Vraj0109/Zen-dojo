from collections import deque

class Solution:
    def removeInvalidParentheses(self, s: str) -> list[str]:
        def is_valid(cand: str) -> bool:
            bal = 0
            for c in cand:
                if c == '(':
                    bal += 1
                elif c == ')':
                    bal -= 1
                    if bal < 0:
                        return False
            return bal == 0

        result = []
        visited = {s}
        q = deque([s])
        found = False

        while q:
            sz = len(q)
            for _ in range(sz):
                cur = q.popleft()
                if is_valid(cur):
                    result.append(cur)
                    found = True

                if found:
                    continue

                for i, c in enumerate(cur):
                    if c not in ('(', ')'):
                        continue
                    nxt = cur[:i] + cur[i + 1:]
                    if nxt not in visited:
                        visited.add(nxt)
                        q.append(nxt)

            if found:
                break

        if not result:
            return [""]
        return result
