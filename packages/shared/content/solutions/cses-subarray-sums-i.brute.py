from typing import List

class Solution:
    def subarraySumsI(self, arr: List[int], target: int) -> int:
        n = len(arr)
        count = 0
        for i in range(n):
            s = 0
            for j in range(i, n):
                s += arr[j]
                if s == target:
                    count += 1
        return count
