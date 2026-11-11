from typing import List

class Solution:
    def collectingNumbers(self, arr: List[int]) -> int:
        n = len(arr)
        pos = [0] * (n + 1)
        for i, val in enumerate(arr):
            pos[val] = i
        rounds = 1
        for x in range(2, n + 1):
            if pos[x] < pos[x - 1]:
                rounds += 1
        return rounds
