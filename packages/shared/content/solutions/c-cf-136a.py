from typing import List

class Solution:
    def reconstructGiftGivers(self, p: List[int]) -> List[int]:
        n = len(p)
        ans = [0] * n
        for i in range(n):
            ans[p[i] - 1] = i + 1
        return ans
