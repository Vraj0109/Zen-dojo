from typing import List

# verify: skip-stress
class Solution:
    def findingBorders(self, s: str) -> List[int]:
        n = len(s)
        if n <= 1:
            return []

        pi = [0] * n
        for i in range(1, n):
            j = pi[i - 1]
            while j > 0 and s[i] != s[j]:
                j = pi[j - 1]
            if s[i] == s[j]:
                j += 1
            pi[i] = j

        borders = []
        k = pi[n - 1]
        while k > 0:
            borders.append(k)
            k = pi[k - 1]

        borders.reverse()
        return borders
