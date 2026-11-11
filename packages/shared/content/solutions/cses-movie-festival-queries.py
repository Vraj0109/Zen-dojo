# verify: skip-stress
import bisect
from typing import List

class Solution:
    def movieFestivalQueries(self, movies: List[List[int]], queries: List[List[int]]) -> List[int]:
        m = len(movies)
        mv = sorted(movies, key=lambda x: (x[0], x[1]))
        st = [x[0] for x in mv]
        en = [x[1] for x in mv] + [float('inf')]
        best = [m] * (m + 1)
        for j in range(m - 1, -1, -1):
            best[j] = j if en[j] < en[best[j + 1]] else best[j + 1]

        LOG = 18
        up = [[m] * (m + 1) for _ in range(LOG + 1)]
        for i in range(m):
            j = bisect.bisect_left(st, en[i])
            up[0][i] = best[j]
        for k in range(1, LOG + 1):
            for i in range(m + 1):
                up[k][i] = up[k - 1][up[k - 1][i]]

        ans = []
        for a, b in queries:
            j = bisect.bisect_left(st, a)
            cur = best[j]
            if cur == m or en[cur] > b:
                ans.append(0)
                continue
            cnt = 1
            for k in range(LOG, -1, -1):
                nx = up[k][cur]
                if nx != m and en[nx] <= b:
                    cur = nx
                    cnt += 1 << k
            ans.append(cnt)
        return ans
