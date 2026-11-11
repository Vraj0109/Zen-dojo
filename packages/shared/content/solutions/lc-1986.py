# verify: skip-stress
from typing import List

class Solution:
    def minSessions(self, tasks: List[int], sessionTime: int) -> int:
        n = len(tasks)
        dp = [(float('inf'), float('inf'))] * (1 << n)
        dp[0] = (1, 0)
        for mask in range(1 << n):
            if dp[mask][0] == float('inf'):
                continue
            for i in range(n):
                if mask & (1 << i):
                    continue
                sessions, time = dp[mask]
                if time + tasks[i] <= sessionTime:
                    time += tasks[i]
                else:
                    sessions += 1
                    time = tasks[i]
                nm = mask | (1 << i)
                if (sessions, time) < dp[nm]:
                    dp[nm] = (sessions, time)
        return dp[(1 << n) - 1][0]