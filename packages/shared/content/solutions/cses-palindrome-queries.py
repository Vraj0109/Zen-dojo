# verify: skip-stress
from typing import List

class Solution:
    def palindromeQueries(self, s: str, queries: List[List[str]]) -> List[str]:
        n = len(s)
        MOD1 = 1000000007
        B1 = 313
        MOD2 = 1000000009
        B2 = 353

        invB1 = pow(B1, MOD1 - 2, MOD1)
        invB2 = pow(B2, MOD2 - 2, MOD2)

        p1 = [1] * (n + 1)
        invP1 = [1] * (n + 1)
        p2 = [1] * (n + 1)
        invP2 = [1] * (n + 1)

        for i in range(1, n + 1):
            p1[i] = (p1[i - 1] * B1) % MOD1
            invP1[i] = (invP1[i - 1] * invB1) % MOD1
            p2[i] = (p2[i - 1] * B2) % MOD2
            invP2[i] = (invP2[i - 1] * invB2) % MOD2

        class Fenwick:
            def __init__(self, size: int, mod: int):
                self.n = size
                self.mod = mod
                self.tree = [0] * (size + 1)

            def add(self, i: int, delta: int):
                delta = (delta % self.mod + self.mod) % self.mod
                while i <= self.n:
                    self.tree[i] = (self.tree[i] + delta) % self.mod
                    i += i & -i

            def query(self, i: int) -> int:
                s = 0
                while i > 0:
                    s = (s + self.tree[i]) % self.mod
                    i -= i & -i
                return s

            def query_range(self, l: int, r: int) -> int:
                return (self.query(r) - self.query(l - 1) + self.mod) % self.mod

        fwd1 = Fenwick(n, MOD1)
        rev1 = Fenwick(n, MOD1)
        fwd2 = Fenwick(n, MOD2)
        rev2 = Fenwick(n, MOD2)

        s_chars = list(s)
        for i in range(1, n + 1):
            val = ord(s_chars[i - 1])
            fwd1.add(i, val * p1[i - 1])
            rev1.add(i, val * p1[n - i])
            fwd2.add(i, val * p2[i - 1])
            rev2.add(i, val * p2[n - i])

        results = []
        for q in queries:
            if q[0] == "1":
                k = int(q[1])
                c = q[2]
                old_val = ord(s_chars[k - 1])
                new_val = ord(c)
                diff = new_val - old_val
                s_chars[k - 1] = c

                fwd1.add(k, diff * p1[k - 1])
                rev1.add(k, diff * p1[n - k])
                fwd2.add(k, diff * p2[k - 1])
                rev2.add(k, diff * p2[n - k])
            else:
                a = int(q[1])
                b = int(q[2])

                hFwd1 = (fwd1.query_range(a, b) * invP1[a - 1]) % MOD1
                hRev1 = (rev1.query_range(a, b) * invP1[n - b]) % MOD1

                hFwd2 = (fwd2.query_range(a, b) * invP2[a - 1]) % MOD2
                hRev2 = (rev2.query_range(a, b) * invP2[n - b]) % MOD2

                if hFwd1 == hRev1 and hFwd2 == hRev2:
                    results.append("YES")
                else:
                    results.append("NO")
        return results
