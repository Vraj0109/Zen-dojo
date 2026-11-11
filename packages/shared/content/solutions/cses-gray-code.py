from typing import List

class Solution:
    def grayCode(self, n: int) -> List[str]:
        out = []
        for i in range(1 << n):
            g = i ^ (i >> 1)
            s = ''.join(str((g >> b) & 1) for b in range(n - 1, -1, -1))
            out.append(s)
        return out
