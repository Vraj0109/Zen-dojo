class Solution:
    def minimalRotation(self, s: str) -> str:
        n = len(s)
        best = s
        for i in range(1, n):
            rot = s[i:] + s[:i]
            if rot < best:
                best = rot
        return best
