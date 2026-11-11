from typing import List
import bisect

class Solution:
    def sumOfTwoValues(self, arr: List[int], target: int) -> List[int]:
        n = len(arr)
        sorted_arr = sorted((arr[i], i + 1) for i in range(n))
        for i in range(1, n + 1):
            needed = target - arr[i - 1]
            idx = bisect.bisect_left(sorted_arr, (needed, i + 1))
            if idx < n and sorted_arr[idx][0] == needed:
                return [i, sorted_arr[idx][1]]
        return [-1, -1]
