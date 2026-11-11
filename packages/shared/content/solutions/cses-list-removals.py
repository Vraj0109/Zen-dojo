# verify: skip-stress
from typing import List

class Solution:
    def listRemovals(self, arr: List[int], positions: List[int]) -> List[int]:
        n = len(arr)
        bit = [0] * (n + 1)
        for i in range(1, n + 1):
            bit[i] += 1
            j = i + (i & -i)
            if j <= n:
                bit[j] += bit[i]
        top = 1
        while top * 2 <= n:
            top *= 2
        ans = []
        for k in positions:
            pos = 0
            step = top
            while step > 0:
                if pos + step <= n and bit[pos + step] < k:
                    pos += step
                    k -= bit[pos]
                step >>= 1
            idx = pos + 1
            ans.append(arr[idx - 1])
            i = idx
            while i <= n:
                bit[i] -= 1
                i += i & -i
        return ans
