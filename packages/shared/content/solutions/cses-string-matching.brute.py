class Solution:
    def stringMatching(self, s: str, pattern: str) -> int:
        n = len(s)
        m = len(pattern)
        if m == 0 or n < m:
            return 0
        count = 0
        for i in range(n - m + 1):
            if s[i:i + m] == pattern:
                count += 1
        return count
