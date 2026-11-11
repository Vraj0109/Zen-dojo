# verify: skip-stress
from typing import List

class Solution:
    def leastInterval(self, tasks: List[str], n: int) -> int:
        cnt = [0] * 26
        for t in tasks:
            cnt[ord(t[0]) - ord('A')] += 1
        f = max(cnt)
        ties = sum(1 for c in cnt if c == f)
        return max(len(tasks), (f - 1) * (n + 1) + ties)