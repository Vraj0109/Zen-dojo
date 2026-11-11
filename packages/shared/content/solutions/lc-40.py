# verify: skip-stress
from typing import List

class Solution:
    def combinationSum2(self, candidates: List[int], target: int) -> List[List[int]]:
        candidates.sort()
        out = []
        cur = []
        def go(start, rem):
            if rem == 0:
                out.append(list(cur))
                return
            for i in range(start, len(candidates)):
                if candidates[i] > rem:
                    break
                if i > start and candidates[i] == candidates[i - 1]:
                    continue
                cur.append(candidates[i])
                go(i + 1, rem - candidates[i])
                cur.pop()
        go(0, target)
        return out