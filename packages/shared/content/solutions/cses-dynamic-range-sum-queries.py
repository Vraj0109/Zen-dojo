from typing import List

class Solution:
    def dynamicRangeSumQueries(self, arr: List[int], queries: List[List[int]]) -> List[int]:
        n = len(arr)
        bit = [0] * (n + 1)

        def add(idx: int, val: int) -> None:
            while idx <= n:
                bit[idx] += val
                idx += idx & -idx

        def query(idx: int) -> int:
            s = 0
            while idx > 0:
                s += bit[idx]
                idx -= idx & -idx
            return s

        a = list(arr)
        for i in range(n):
            add(i + 1, a[i])

        ans = []
        for q in queries:
            if q[0] == 1:
                k, u = q[1], q[2]
                delta = u - a[k - 1]
                a[k - 1] = u
                add(k, delta)
            elif q[0] == 2:
                l, r = q[1], q[2]
                ans.append(query(r) - query(l - 1))
        return ans
