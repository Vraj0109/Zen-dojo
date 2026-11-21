from typing import List

class Solution:
    def permutations(self, n: int) -> List[int]:
        if n == 1:
            return [1]
        if n == 2 or n == 3:
            return []
        return [i for i in range(2, n + 1, 2)] + [i for i in range(1, n + 1, 2)]
