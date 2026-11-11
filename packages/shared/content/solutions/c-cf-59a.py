class Solution:
    def normalizeWord(self, s: str) -> str:
        up = sum(1 for c in s if c.isupper())
        low = sum(1 for c in s if c.islower())
        return s.upper() if up > low else s.lower()
