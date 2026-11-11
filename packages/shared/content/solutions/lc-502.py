# verify: skip-stress
from typing import List
import heapq

class Solution:
    def findMaximizedCapital(self, k: int, w: int, profits: List[int], capital: List[int]) -> int:
        n = len(profits)
        proj = sorted(zip(capital, profits))
        pq = []
        money = w
        idx = 0
        for _ in range(k):
            while idx < n and proj[idx][0] <= money:
                heapq.heappush(pq, -proj[idx][1])
                idx += 1
            if not pq:
                break
            money += -heapq.heappop(pq)
        return min(money, 2147483647)