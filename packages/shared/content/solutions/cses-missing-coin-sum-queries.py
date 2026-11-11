# verify: skip-stress
import bisect
from typing import List

class Solution:
    def missingCoinSumQueries(self, coins: List[int], queries: List[List[int]]) -> List[int]:
        n = len(coins)
        order = sorted(range(n), key=lambda x: coins[x])
        sorted_vals = [coins[i] for i in order]

        L = [0]
        R = [0]
        S = [0]

        def new_node(l: int, r: int, s: int) -> int:
            idx = len(L)
            L.append(l)
            R.append(r)
            S.append(s)
            return idx

        def add(v: int, l: int, r: int, p: int, x: int) -> int:
            nl, nr = L[v], R[v]
            if l == r:
                return new_node(0, 0, S[v] + x)
            m = (l + r) // 2
            if p <= m:
                nl = add(nl, l, m, p, x)
            else:
                nr = add(nr, m + 1, r, p, x)
            return new_node(nl, nr, S[nl] + S[nr])

        def query(v: int, l: int, r: int, a: int, b: int) -> int:
            if v == 0 or b < l or r < a:
                return 0
            if a <= l and r <= b:
                return S[v]
            m = (l + r) // 2
            return query(L[v], l, m, a, b) + query(R[v], m + 1, r, a, b)

        root = [0] * (n + 1)
        for i in range(n):
            root[i + 1] = add(root[i], 0, n - 1, order[i], coins[order[i]])

        ans = []
        for q in queries:
            s = 0
            while True:
                c = bisect.bisect_right(sorted_vals, s + 1)
                t = query(root[c], 0, n - 1, q[0] - 1, q[1] - 1)
                if t == s:
                    break
                s = t
            ans.append(s + 1)
        return ans
