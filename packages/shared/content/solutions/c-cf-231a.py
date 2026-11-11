from typing import List

class Solution:
    def teamProblems(self, rows: List[List[int]]) -> int:
        return sum(1 for r in rows if r[0] + r[1] + r[2] >= 2)
