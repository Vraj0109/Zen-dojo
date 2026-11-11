# verify: skip-stress
from typing import List

class Solution:
    def companyQueriesI(self, n: int, bosses: List[int], queries: List[List[int]]) -> List[int]:
        par = [0] * (n + 1)
        for i in range(n - 1):
            par[i + 2] = bosses[i]
        LOG = 1
        while (1 << LOG) <= n:
            LOG += 1
        up = [[0] * (n + 1) for _ in range(LOG)]
        for v in range(1, n + 1):
            up[0][v] = par[v]
        for j in range(1, LOG):
            uj1 = up[j - 1]
            uj = up[j]
            for v in range(1, n + 1):
                uj[v] = uj1[uj1[v]]

        ans = []
        for v, k in queries:
            for j in range(LOG):
                if (k >> j) & 1:
                    v = up[j][v]
                    if v == 0:
                        break
            if (k >> LOG) != 0:
                v = 0
            ans.append(-1 if v == 0 else v)
        return ans
