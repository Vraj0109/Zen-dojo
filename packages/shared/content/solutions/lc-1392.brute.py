class Solution:
    def longestPrefix(self, s: str) -> str:
        n = len(s)
        for length in range(n - 1, 0, -1):
            if s[:length] == s[n - length:]:
                return s[:length]
        return ""
