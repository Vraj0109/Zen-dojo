# verify: skip-stress
from typing import List

class Solution:
    def pizzeriaQueries(self, prices: List[int], queries: List[List[int]]) -> List[int]:
        n = len(prices)
        INF = float('inf')
        A = [INF] * (2 * n)
        B = [INF] * (2 * n)
        for i in range(n):
            A[n + i] = prices[i] - (i + 1)
            B[n + i] = prices[i] + (i + 1)
        for i in range(n - 1, 0, -1):
            A[i] = A[2 * i] if A[2 * i] < A[2 * i + 1] else A[2 * i + 1]
            B[i] = B[2 * i] if B[2 * i] < B[2 * i + 1] else B[2 * i + 1]

        def setv(t: List[int], p: int, v: int) -> None:
            p += n
            t[p] = v
            p >>= 1
            while p >= 1:
                t[p] = t[2 * p] if t[2 * p] < t[2 * p + 1] else t[2 * p + 1]
                p >>= 1

        def get(t: List[int], l: int, r: int) -> int:
            res = INF
            l += n
            r += n
            while l < r:
                if l & 1:
                    if t[l] < res:
                        res = t[l]
                    l += 1
                if r & 1:
                    r -= 1
                    if t[r] < res:
                        res = t[r]
                l >>= 1
                r >>= 1
            return res

        ans = []
        for q in queries:
            if q[0] == 1:
                k, x = q[1], q[2]
                setv(A, k - 1, x - k)
                setv(B, k - 1, x + k)
            else:
                k = q[1]
                left = get(A, 0, k) + k
                right = get(B, k - 1, n) - k
                ans.append(int(left if left < right else right))
        return ans
