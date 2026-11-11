from typing import List

class Solution:
    def rangeSumMutable(self, nums: List[int], queries: List[List[int]]) -> List[int]:
        n = len(nums)
        tree = [0] * (n + 1)

        def add(i: int, delta: int) -> None:
            while i <= n:
                tree[i] += delta
                i += i & -i

        def query(i: int) -> int:
            s = 0
            while i > 0:
                s += tree[i]
                i -= i & -i
            return s

        for i in range(n):
            add(i + 1, nums[i])

        res = []
        for q in queries:
            if q[0] == 1:
                idx, val = q[1], q[2]
                delta = val - nums[idx]
                nums[idx] = val
                add(idx + 1, delta)
            else:
                l, r = q[1], q[2]
                res.append(query(r + 1) - query(l))
        return res
