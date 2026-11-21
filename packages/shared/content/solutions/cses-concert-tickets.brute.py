from typing import List

class Solution:
    def concertTickets(self, tickets: List[int], maxPrices: List[int]) -> List[int]:
        remaining = list(tickets)
        ans = []
        for p in maxPrices:
            best_idx = -1
            for i, t in enumerate(remaining):
                if t <= p:
                    if best_idx == -1 or t > remaining[best_idx]:
                        best_idx = i
            if best_idx != -1:
                ans.append(remaining.pop(best_idx))
            else:
                ans.append(-1)
        return ans
