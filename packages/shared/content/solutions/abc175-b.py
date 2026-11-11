from typing import List

class Solution:
    def countTriangles(self, l: List[int]) -> int:
        n = len(l)
        count = 0
        for i in range(n):
            for j in range(i + 1, n):
                for k in range(j + 1, n):
                    a, b, c = l[i], l[j], l[k]
                    if a == b or b == c or a == c:
                        continue
                    mx = max(a, b, c)
                    if mx < a + b + c - mx:
                        count += 1
        return count
