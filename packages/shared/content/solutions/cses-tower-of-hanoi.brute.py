from typing import List

class Solution:
    def towerOfHanoi(self, n: int) -> List[List[int]]:
        moves = []

        def hanoi(count, src, dst, aux):
            if count == 0:
                return
            hanoi(count - 1, src, aux, dst)
            moves.append([src, dst])
            hanoi(count - 1, aux, dst, src)

        hanoi(n, 1, 3, 2)
        return moves
