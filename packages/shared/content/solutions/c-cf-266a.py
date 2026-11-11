class Solution:
    def stonesOnTable(self, s: str) -> int:
        return sum(1 for i in range(1, len(s)) if s[i] == s[i - 1])
