# verify: skip-stress
import bisect
from typing import List

class Solution:
    def distinctValuesQueries(self, arr: List[int], queries: List[List[int]]) -> List[int]:
        n = len(arr)
        q = len(queries)
        vals = sorted(set(arr))
        comp = [bisect.bisect_left(vals, x) for x in arr]
        by_right = sorted(range(q), key=lambda x: queries[x][1])
        bit = [0] * (n + 1)
        last = [0] * len(vals)
        ans = [0] * q

        def add(i: int, v: int) -> None:
            while i <= n:
                bit[i] += v
                i += i & -i

        def pre(i: int) -> int:
            s = 0
            while i > 0:
                s += bit[i]
                i -= i & -i
            return s

        pos = 0
        for id in by_right:
            while pos < queries[id][1]:
                pos += 1
                c = comp[pos - 1]
                if last[c]:
                    add(last[c], -1)
                add(pos, 1)
                last[c] = pos
            ans[id] = pre(queries[id][1]) - pre(queries[id][0] - 1)
        return ans
