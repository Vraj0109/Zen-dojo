from typing import List

class Solution:
    def increasingArray(self, x: List[int]) -> int:
        moves = 0
        cur = list(x)
        for i in range(1, len(cur)):
            if cur[i] < cur[i - 1]:
                moves += cur[i - 1] - cur[i]
                cur[i] = cur[i - 1]
        return moves
