# verify: skip-stress
from typing import List
import bisect

class Solution:
    def concertTickets(self, tickets: List[int], maxPrices: List[int]) -> List[int]:
        s_tickets = sorted(tickets)
        ans = []
        for p in maxPrices:
            idx = bisect.bisect_right(s_tickets, p)
            if idx == 0:
                ans.append(-1)
            else:
                ans.append(s_tickets.pop(idx - 1))
        return ans
