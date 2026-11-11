# verify: skip-stress
from typing import List

class Solution:
    def hotelQueries(self, rooms: List[int], groups: List[int]) -> List[int]:
        n = len(rooms)
        sz = 1
        while sz < n:
            sz <<= 1
        t = [0] * (2 * sz)
        for i in range(n):
            t[sz + i] = rooms[i]
        for i in range(sz - 1, 0, -1):
            t[i] = t[2 * i] if t[2 * i] > t[2 * i + 1] else t[2 * i + 1]
        ans = []
        for r in groups:
            if t[1] < r:
                ans.append(0)
                continue
            p = 1
            while p < sz:
                p = 2 * p if t[2 * p] >= r else 2 * p + 1
            t[p] -= r
            ans.append(p - sz + 1)
            p >>= 1
            while p >= 1:
                t[p] = t[2 * p] if t[2 * p] > t[2 * p + 1] else t[2 * p + 1]
                p >>= 1
        return ans
