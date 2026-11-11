from typing import List

class Solution:
    def sumOfThreeValues(self, arr: List[int], target: int) -> List[int]:
        n = len(arr)
        a = sorted((arr[i], i + 1) for i in range(n))
        for i in range(n - 2):
            l, r = i + 1, n - 1
            while l < r:
                s = a[i][0] + a[l][0] + a[r][0]
                if s == target:
                    return sorted([a[i][1], a[l][1], a[r][1]])
                elif s < target:
                    l += 1
                else:
                    r -= 1
        return [-1, -1, -1]
