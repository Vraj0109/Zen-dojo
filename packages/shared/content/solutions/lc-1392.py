# verify: skip-stress
class Solution:
    def longestPrefix(self, s: str) -> str:
        n = len(s)
        pi = [0] * n
        for i in range(1, n):
            k = pi[i - 1]
            while k > 0 and s[i] != s[k]:
                k = pi[k - 1]
            if s[i] == s[k]:
                k += 1
            pi[i] = k
        return s[:pi[n - 1]]