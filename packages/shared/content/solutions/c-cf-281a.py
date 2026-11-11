class Solution:
    def capitalizeWord(self, s: str) -> str:
        if s:
            return s[0].upper() + s[1:]
        return s
