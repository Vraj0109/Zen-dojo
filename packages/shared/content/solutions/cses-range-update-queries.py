from typing import List

class Solution:
    def rangeUpdateQueries(self, arr: List[int], queries: List[List[int]]) -> List[int]:
        n = len(arr)
        bit = [0] * (n + 2)

        def add(i: int, v: int) -> None:
            while i <= n:
                bit[i] += v
                i += i & -i

        def pref(i: int) -> int:
            s = 0
            while i > 0:
                s += bit[i]
                i -= i & -i
            return s

        ans = []
        for q in queries:
            if q[0] == 1:
                add(q[1], q[3])
                if q[2] + 1 <= n:
                    add(q[2] + 1, -q[3])
            else:
                ans.append(arr[q[1] - 1] + pref(q[1]))
        return ans
