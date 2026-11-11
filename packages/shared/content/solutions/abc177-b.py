class Solution:
    def minToContain(self, s: str, t: str) -> int:
        best = len(t)
        for i in range(len(s) - len(t) + 1):
            c = sum(1 for j in range(len(t)) if s[i + j] != t[j])
            if c < best:
                best = c
        return best
