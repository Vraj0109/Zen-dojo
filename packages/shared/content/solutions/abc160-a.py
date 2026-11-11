class Solution:
    def isCoffeeLike(self, s: str) -> str:
        return "Yes" if s[2] == s[3] and s[4] == s[5] else "No"
