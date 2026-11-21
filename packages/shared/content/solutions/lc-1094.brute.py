from typing import List

class Solution:
    def carPooling(self, trips: List[List[int]], capacity: int) -> bool:
        road = [0] * 1001
        for num, frm, to in trips:
            for km in range(frm, to):
                road[km] += num
                if road[km] > capacity:
                    return False
        return True
