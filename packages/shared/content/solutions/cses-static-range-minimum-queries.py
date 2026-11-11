from typing import List

class Solution:
    def staticRangeMinimumQueries(self, arr: List[int], queries: List[List[int]]) -> List[int]:
        n = len(arr)
        if n == 0:
            return []
        max_log = n.bit_length()
        st = [[0] * n for _ in range(max_log)]
        for i in range(n):
            st[0][i] = arr[i]
        for k in range(1, max_log):
            length = 1 << (k - 1)
            for i in range(n - (1 << k) + 1):
                st[k][i] = min(st[k - 1][i], st[k - 1][i + length])

        ans = []
        for q in queries:
            l = q[0] - 1
            r = q[1] - 1
            length = r - l + 1
            k = length.bit_length() - 1
            ans.append(min(st[k][l], st[k][r - (1 << k) + 1]))
        return ans
