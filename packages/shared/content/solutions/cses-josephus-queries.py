# verify: skip-stress
from typing import List

class Solution:
    def josephusQueries(self, queries: List[List[int]]) -> List[int]:
        def solve(n, k):
            if n == 1:
                return 1
            if k <= (n + 1) // 2:
                if 2 * k > n:
                    return 1
                return 2 * k
            temp = solve(n // 2, k - (n + 1) // 2)
            if n % 2 == 1:
                return 2 * temp + 1
            else:
                return 2 * temp - 1
        return [solve(q[0], q[1]) for q in queries]