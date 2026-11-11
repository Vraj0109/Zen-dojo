import bisect
from typing import List

class Solution:
    def slidingWindowMedian(self, nums: List[int], k: int) -> List[int]:
        window = sorted(nums[:k])
        out = []
        is_odd = (k % 2 == 1)
        mid_idx = k // 2

        for i in range(k, len(nums) + 1):
            if is_odd:
                out.append(2 * window[mid_idx])
            else:
                out.append(window[mid_idx - 1] + window[mid_idx])
            if i == len(nums):
                break
            rem_val = nums[i - k]
            del_idx = bisect.bisect_left(window, rem_val)
            del window[del_idx]
            add_val = nums[i]
            ins_idx = bisect.bisect_left(window, add_val)
            window.insert(ins_idx, add_val)
        return out
