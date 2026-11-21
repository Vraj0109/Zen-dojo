from typing import List

class Solution:
    def factoryMachines(self, machines: List[int], t: int) -> int:
        min_val = min(machines)
        lo = 1
        hi = min_val * t
        ans = hi
        while lo <= hi:
            mid = (lo + hi) // 2
            products = sum(mid // m for m in machines)
            if products >= t:
                ans = mid
                hi = mid - 1
            else:
                lo = mid + 1
        return ans
