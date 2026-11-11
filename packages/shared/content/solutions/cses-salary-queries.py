# verify: skip-stress
import bisect
from typing import List

class Solution:
    def salaryQueries(self, salaries: List[int], queries: List[List[int]]) -> List[int]:
        vals = list(salaries)
        for q in queries:
            if q[0] == 1:
                vals.append(q[2])
        vals = sorted(set(vals))
        m = len(vals)
        bit = [0] * (m + 1)

        def add(i: int, v: int) -> None:
            while i <= m:
                bit[i] += v
                i += i & -i

        def pre(i: int) -> int:
            s = 0
            while i > 0:
                s += bit[i]
                i -= i & -i
            return s

        def get_id(v: int) -> int:
            return bisect.bisect_left(vals, v) + 1

        cur = list(salaries)
        for v in cur:
            add(get_id(v), 1)

        ans = []
        for q in queries:
            if q[0] == 1:
                add(get_id(cur[q[1] - 1]), -1)
                cur[q[1] - 1] = q[2]
                add(get_id(q[2]), 1)
            else:
                lo = bisect.bisect_left(vals, q[1])
                hi = bisect.bisect_right(vals, q[2])
                ans.append(pre(hi) - pre(lo))
        return ans
