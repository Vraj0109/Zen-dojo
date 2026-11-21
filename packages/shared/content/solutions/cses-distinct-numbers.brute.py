from typing import List

class Solution:
    def distinctNumbers(self, arr: List[int]) -> int:
        unique = []
        for x in arr:
            found = False
            for u in unique:
                if u == x:
                    found = True
                    break
            if not found:
                unique.append(x)
        return len(unique)
