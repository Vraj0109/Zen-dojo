from typing import List

class Solution:
    def kindsOfItems(self, s: List[str]) -> int:
        return len(set(s))
