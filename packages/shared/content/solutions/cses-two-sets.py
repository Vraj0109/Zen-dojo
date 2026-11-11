from typing import List

class Solution:
    def twoSets(self, n: int) -> List[List[int]]:
        total = n * (n + 1) // 2
        if total % 2 != 0:
            return []
        target = total // 2
        s1, s2 = [], []
        for i in range(n, 0, -1):
            if target >= i:
                s1.append(i)
                target -= i
            else:
                s2.append(i)
        s1.reverse()
        s2.reverse()
        return [s1, s2]
