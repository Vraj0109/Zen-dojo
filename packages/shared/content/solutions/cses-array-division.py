from typing import List

class Solution:
    def arrayDivision(self, arr: List[int], k: int) -> int:
        lo = max(arr)
        hi = sum(arr)
        ans = hi
        while lo <= hi:
            mid = lo + (hi - lo) // 2
            count = 1
            cur = 0
            for x in arr:
                if cur + x > mid:
                    count += 1
                    cur = x
                else:
                    cur += x
            if count <= k:
                ans = mid
                hi = mid - 1
            else:
                lo = mid + 1
        return ans
