# verify: skip-stress
from typing import List

class Solution:
    def corpFlightBookings(self, bookings: List[List[int]], n: int) -> List[int]:
        diff = [0] * (n + 2)
        ans = [0] * n
        for first, last, seats in bookings:
            diff[first] += seats
            diff[last + 1] -= seats
        run = 0
        for i in range(1, n + 1):
            run += diff[i]
            ans[i - 1] = run
        return ans