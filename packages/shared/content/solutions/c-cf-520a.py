class Solution:
    def isPangramString(self, s: str) -> bool:
        return len({c for c in s.lower() if 'a' <= c <= 'z'}) == 26
