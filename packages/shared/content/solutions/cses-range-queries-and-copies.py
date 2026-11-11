# verify: skip-stress
from typing import List

class Solution:
    def rangeQueriesAndCopies(self, arr: List[int], queries: List[List[int]]) -> List[int]:
        n = len(arr)
        L = [0]
        R = [0]
        S = [0]

        def new_node(l: int, r: int, s: int) -> int:
            idx = len(L)
            L.append(l)
            R.append(r)
            S.append(s)
            return idx

        def build(l: int, r: int) -> int:
            if l == r:
                return new_node(0, 0, arr[l])
            m = (l + r) // 2
            x = build(l, m)
            y = build(m + 1, r)
            return new_node(x, y, S[x] + S[y])

        def update(v: int, l: int, r: int, p: int, x: int) -> int:
            if l == r:
                return new_node(0, 0, x)
            m = (l + r) // 2
            nl, nr = L[v], R[v]
            if p <= m:
                nl = update(nl, l, m, p, x)
            else:
                nr = update(nr, m + 1, r, p, x)
            return new_node(nl, nr, S[nl] + S[nr])

        def query(v: int, l: int, r: int, a: int, b: int) -> int:
            if a <= l and r <= b:
                return S[v]
            m = (l + r) // 2
            s = 0
            if a <= m:
                s += query(L[v], l, m, a, b)
            if b > m:
                s += query(R[v], m + 1, r, a, b)
            return s

        root = [build(0, n - 1)]
        ans = []
        for q in queries:
            if q[0] == 1:
                k = q[1] - 1
                root[k] = update(root[k], 0, n - 1, q[2] - 1, q[3])
            elif q[0] == 2:
                ans.append(query(root[q[1] - 1], 0, n - 1, q[2] - 1, q[3] - 1))
            else:
                root.append(root[q[1] - 1])
        return ans
