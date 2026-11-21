from typing import List

class Solution:
    def sumOfThreeValues(self, arr: List[int], target: int) -> List[int]:
        n = len(arr)
        for i in range(n):
            for j in range(i + 1, n):
                for k in range(j + 1, n):
                    if arr[i] + arr[j] + arr[k] == target:
                        return [i + 1, j + 1, k + 1]
        return [-1, -1, -1]
