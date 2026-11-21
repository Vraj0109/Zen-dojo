from typing import List

class Solution:
    def increasingArray(self, x: List[int]) -> int:
        moves = 0
        arr = list(x)
        for i in range(1, len(arr)):
            diff = arr[i - 1] - arr[i]
            if diff > 0:
                moves += diff
                arr[i] = arr[i - 1]
        return moves
