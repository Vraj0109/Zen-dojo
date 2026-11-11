from typing import List

class Solution:
    def detectCycle(self, nums: List[int], pos: int) -> int:
        n = len(nums)
        if n == 0:
            return -1

        def get_next(i: int) -> int:
            return i + 1 if i + 1 < n else pos

        slow = 0
        fast = 0
        while True:
            slow = get_next(slow)
            if slow < 0:
                return -1
            fast = get_next(fast)
            if fast < 0:
                return -1
            fast = get_next(fast)
            if fast < 0:
                return -1
            if slow == fast:
                break

        slow = 0
        while slow != fast:
            slow = get_next(slow)
            fast = get_next(fast)
        return slow
