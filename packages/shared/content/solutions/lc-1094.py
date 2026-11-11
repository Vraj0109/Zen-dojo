# verify: skip-stress
from typing import List

class Solution:
    def carPooling(self, trips: List[List[int]], capacity: int) -> bool:
        diff = [0] * 1002
        for num, start, end in trips:
            diff[start] += num
            diff[end] -= num
        load = 0
        for d in diff:
            load += d
            if load > capacity:
                return False
        return True