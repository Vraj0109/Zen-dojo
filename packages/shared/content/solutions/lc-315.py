# verify: skip-stress
from typing import List

class Solution:
    def countSmaller(self, nums: List[int]) -> List[int]:
        OFF = 10001
        V = 20003
        bit = [0] * (V + 1)
        def add(i):
            while i <= V:
                bit[i] += 1
                i += i & -i
        def query(i):
            s = 0
            while i > 0:
                s += bit[i]
                i -= i & -i
            return s
        ans = [0] * len(nums)
        for i in range(len(nums) - 1, -1, -1):
            p = nums[i] + OFF
            ans[i] = query(p - 1)
            add(p)
        return ans