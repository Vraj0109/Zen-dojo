from typing import List

class Solution:
    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
        groups: dict[tuple, list[str]] = {}
        for s in strs:
            count = [0] * 26
            for c in s:
                count[ord(c) - 97] += 1
            key = tuple(count)
            groups.setdefault(key, []).append(s)
        return list(groups.values())
