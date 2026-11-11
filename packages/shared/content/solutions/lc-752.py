# verify: skip-stress
from typing import List
from collections import deque

class Solution:
    def openLock(self, deadends: List[str], target: str) -> int:
        seen = set(deadends)
        if "0000" in seen:
            return -1
        if target == "0000":
            return 0
        q = deque([("0000", 0)])
        seen.add("0000")
        while q:
            s, d = q.popleft()
            for i in range(4):
                for delta in (1, 9):
                    t = s[:i] + str((int(s[i]) + delta) % 10) + s[i+1:]
                    if t in seen:
                        continue
                    if t == target:
                        return d + 1
                    seen.add(t)
                    q.append((t, d + 1))
        return -1