# verify: skip-stress
from typing import List
from collections import defaultdict
import heapq

class Solution:
    def findItinerary(self, tickets: List[List[str]]) -> List[str]:
        g = defaultdict(list)
        for u, v in tickets:
            heapq.heappush(g[u], v)
        route = []
        def visit(a):
            while g[a]:
                nxt = heapq.heappop(g[a])
                visit(nxt)
            route.append(a)
        visit("JFK")
        return route[::-1]