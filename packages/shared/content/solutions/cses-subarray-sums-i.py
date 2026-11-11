from typing import List

class Solution:
    def subarraySumsI(self, arr: List[int], target: int) -> int:
        l = 0
        count = 0
        cur_sum = 0
        for r in range(len(arr)):
            cur_sum += arr[r]
            while cur_sum > target and l <= r:
                cur_sum -= arr[l]
                l += 1
            if cur_sum == target:
                count += 1
        return count
