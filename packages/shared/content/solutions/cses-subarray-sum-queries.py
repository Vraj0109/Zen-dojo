# verify: skip-stress
from typing import List

class Solution:
    def subarraySumQueries(self, arr: List[int], queries: List[List[int]]) -> List[int]:
        n = len(arr)
        t_sum = [0] * (4 * n)
        t_pref = [0] * (4 * n)
        t_suf = [0] * (4 * n)
        t_best = [0] * (4 * n)

        def set_leaf(v: int, x: int) -> None:
            p = x if x > 0 else 0
            t_sum[v] = x
            t_pref[v] = p
            t_suf[v] = p
            t_best[v] = p

        def pull(v: int) -> None:
            l = 2 * v
            r = 2 * v + 1
            ls, lp, lsf, lb = t_sum[l], t_pref[l], t_suf[l], t_best[l]
            rs, rp, rsf, rb = t_sum[r], t_pref[r], t_suf[r], t_best[r]
            t_sum[v] = ls + rs
            t_pref[v] = lp if lp > ls + rp else ls + rp
            t_suf[v] = rsf if rsf > rs + lsf else rs + lsf
            b1 = lb if lb > rb else rb
            b2 = lsf + rp
            t_best[v] = b1 if b1 > b2 else b2

        def build(v: int, l: int, r: int) -> None:
            if l == r:
                set_leaf(v, arr[l])
                return
            m = (l + r) // 2
            build(2 * v, l, m)
            build(2 * v + 1, m + 1, r)
            pull(v)

        def update(v: int, l: int, r: int, p: int, x: int) -> None:
            if l == r:
                set_leaf(v, x)
                return
            m = (l + r) // 2
            if p <= m:
                update(2 * v, l, m, p, x)
            else:
                update(2 * v + 1, m + 1, r, p, x)
            pull(v)

        build(1, 0, n - 1)
        ans = []
        for q in queries:
            update(1, 0, n - 1, q[0] - 1, q[1])
            ans.append(t_best[1])
        return ans
