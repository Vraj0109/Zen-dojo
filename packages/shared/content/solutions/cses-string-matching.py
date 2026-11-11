class Solution:
    def stringMatching(self, s: str, pattern: str) -> int:
        n, m = len(s), len(pattern)
        if m == 0 or n < m:
            return 0
        pi = [0] * m
        j = 0
        for i in range(1, m):
            while j > 0 and pattern[i] != pattern[j]:
                j = pi[j - 1]
            if pattern[i] == pattern[j]:
                j += 1
            pi[i] = j

        count = 0
        j = 0
        for i in range(n):
            while j > 0 and s[i] != pattern[j]:
                j = pi[j - 1]
            if s[i] == pattern[j]:
                j += 1
            if j == m:
                count += 1
                j = pi[j - 1]
        return count
