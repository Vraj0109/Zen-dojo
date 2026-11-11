from typing import List

class Solution:
    def maximumSubarraySum(self, arr: List[int]) -> int:
        max_so_far = arr[0]
        cur = arr[0]
        for i in range(1, len(arr)):
            cur = max(arr[i], cur + arr[i])
            max_so_far = max(max_so_far, cur)
        return max_so_far
