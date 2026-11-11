from typing import List

class Solution:
    def factoryMachines(self, machines: List[int], t: int) -> int:
        lo = 1
        min_val = min(machines)
        hi = min_val * t
        ans = hi
        while lo <= hi:
            mid = lo + (hi - lo) // 2
            products = 0
            for m in machines:
                products += mid // m
                if products >= t:
                    break
            if products >= t:
                ans = mid
                hi = mid - 1
            else:
                lo = mid + 1
        return ans
