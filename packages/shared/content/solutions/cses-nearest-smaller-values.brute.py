from typing import List

class Solution:
    def nearestSmallerValues(self, arr: List[int]) -> List[int]:
        n = len(arr)
        ans = [0] * n
        for i in range(n):
            for j in range(i - 1, -1, -1):
                if arr[j] < arr[i]:
                    ans[i] = j + 1
                    break
        return ans
