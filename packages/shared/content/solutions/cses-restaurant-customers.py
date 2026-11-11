from typing import List

class Solution:
    def restaurantCustomers(self, customers: List[List[int]]) -> int:
        events = []
        for a, b in customers:
            events.append((a, 1))
            events.append((b, -1))
        events.sort()
        cur, best = 0, 0
        for t, delta in events:
            cur += delta
            best = max(best, cur)
        return best
