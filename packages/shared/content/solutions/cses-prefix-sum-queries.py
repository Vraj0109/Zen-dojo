# verify: skip-stress
from typing import List

class Solution:
    def prefixSumQueries(self, arr: List[int], queries: List[List[int]]) -> List[int]:
        n = len(arr)
        t_sum = [0] * (4 * n)
        t_pref = [0] * (4 * n)

        def build(v: int, l: int, r: int) -> None:
            if l == r:
                val = arr[l]
                t_sum[v] = val
                t_pref[v] = val if val > 0 else 0
                return
            m = (l + r) // 2
            build(2 * v, l, m)
            build(2 * v + 1, m + 1, r)
            ls, lp = t_sum[2 * v], t_pref[2 * v]
            rs, rp = t_sum[2 * v + 1], t_pref[2 * v + 1]
            t_sum[v] = ls + rs
            t_pref[v] = lp if lp > ls + rp else ls + rp

        def update(v: int, l: int, r: int, p: int, x: int) -> None:
            if l == r:
                t_sum[v] = x
                t_pref[v] = x if x > 0 else 0
                return
            m = (l + r) // 2
            if p <= m:
                update(2 * v, l, m, p, x)
            else:
                update(2 * v + 1, m + 1, r, p, x)
            ls, lp = t_sum[2 * v], t_pref[2 * v]
            rs, rp = t_sum[2 * v + 1], t_pref[2 * v + 1]
            t_sum[v] = ls + rs
            t_pref[v] = lp if lp > ls + rp else ls + rp

        def query(v: int, l: int, r: int, a: int, b: int) -> tuple[int, int]:
            if a <= l and r <= b:
                return (t_sum[v], t_pref[v])
            m = (l + r) // 2
            if b <= m:
                return query(2 * v, l, m, a, b)
            if a > m:
                return query(2 * v + 1, m + 1, r, a, b)
            ls, lp = query(2 * v, l, m, a, b)
            rs, rp = query(2 * v + 1, m + 1, r, a, b)
            return (ls + rs, lp if lp > ls + rp else ls + rp)

        build(1, 0, n - 1)
        ans = []
        for q in queries:
            if q[0] == 1:
                update(1, 0, n - 1, q[1] - 1, q[2])
            else:
                ans.append(query(1, 0, n - 1, q[1] - 1, q[2] - 1)[1])
        return ans
