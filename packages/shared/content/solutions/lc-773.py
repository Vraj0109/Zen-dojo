# verify: skip-stress
from typing import List
from collections import deque

class Solution:
    def slidingPuzzle(self, board: List[List[int]]) -> int:
        start = "".join(str(x) for row in board for x in row)
        goal = "123450"
        nb = [[1, 3], [0, 2, 4], [1, 5], [0, 4], [1, 3, 5], [2, 4]]
        seen = {start}
        q = deque([(start, 0)])
        while q:
            s, d = q.popleft()
            if s == goal:
                return d
            z = s.index('0')
            for j in nb[z]:
                arr = list(s)
                arr[z], arr[j] = arr[j], arr[z]
                t = "".join(arr)
                if t not in seen:
                    seen.add(t)
                    q.append((t, d + 1))
        return -1