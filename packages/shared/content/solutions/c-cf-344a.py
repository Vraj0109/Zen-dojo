from typing import List

class Solution:
    def countMagnetGroups(self, magnets: List[str]) -> int:
        if not magnets:
            return 0
        groups = 1
        for i in range(1, len(magnets)):
            if magnets[i] != magnets[i - 1]:
                groups += 1
        return groups
