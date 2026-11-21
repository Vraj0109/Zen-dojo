from typing import List

class Solution:
    def totalFruit(self, fruits: List[int]) -> int:
        n = len(fruits)
        best = 0
        for i in range(n):
            types = set()
            for j in range(i, n):
                types.add(fruits[j])
                if len(types) > 2:
                    break
                best = max(best, j - i + 1)
        return best
