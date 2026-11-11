# verify: skip-stress
class Solution:
    def minimalRotation(self, s: str) -> str:
        n = len(s)
        S = s + s
        f = [-1] * (2 * n)
        k = 0
        for j in range(1, 2 * n):
            sj = S[j]
            i = f[j - k - 1]
            while i != -1 and sj != S[k + i + 1]:
                if sj < S[k + i + 1]:
                    k = j - i - 1
                i = f[i]
            if sj != S[k + i + 1]:
                if sj < S[k]:
                    k = j
                f[j - k] = -1
            else:
                f[j - k] = i + 1
        return S[k : k + n]
