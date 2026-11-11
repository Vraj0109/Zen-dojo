from typing import List

class Solution:
    def dynamicRangeMinimumQueries(self, arr: List[int], queries: List[List[int]]) -> List[int]:
        n = len(arr)
        t = [0] * (2 * n)
        for i in range(n):
            t[n + i] = arr[i]
        for i in range(n - 1, 0, -1):
            t[i] = min(t[2 * i], t[2 * i + 1])

        ans = []
        INF = float('inf')
        for q in queries:
            if q[0] == 1:
                p = q[1] - 1 + n
                t[p] = q[2]
                p >>= 1
                while p >= 1:
                    t[p] = min(t[2 * p], t[2 * p + 1])
                    p >>= 1
            else:
                l = q[1] - 1 + n
                r = q[2] + n
                res = INF
                while l < r:
                    if l & 1:
                        res = min(res, t[l])
                        l += 1
                    if r & 1:
                        r -= 1
                        res = min(res, t[r])
                    l >>= 1
                    r >>= 1
                ans.append(res)
        return ans
