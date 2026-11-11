class Solution:
    def minChanges(self, s: str, t: str) -> int:
        return sum(1 for a, b in zip(s, t) if a != b)
