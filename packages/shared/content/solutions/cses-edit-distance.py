# verify: skip-stress
class Solution:
    def editDistance(self, s1: str, s2: str) -> int:
        n, m = len(s1), len(s2)
        prev = list(range(m + 1))
        curr = [0] * (m + 1)
        for i in range(1, n + 1):
            curr[0] = i
            c1 = s1[i - 1]
            for j in range(1, m + 1):
                if c1 == s2[j - 1]:
                    curr[j] = prev[j - 1]
                else:
                    curr[j] = 1 + min(prev[j], curr[j - 1], prev[j - 1])
            prev, curr = curr, prev
        return prev[m]
