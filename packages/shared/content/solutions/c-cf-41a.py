class Solution:
    def checkTranslation(self, s: str, t: str) -> bool:
        return s[::-1] == t
