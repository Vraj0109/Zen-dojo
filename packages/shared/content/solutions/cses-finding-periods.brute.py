class Solution:
    def findingPeriods(self, s: str) -> list[int]:
        n = len(s)
        periods = []
        for p in range(1, n):
            if s[:n - p] == s[p:]:
                periods.append(p)
        periods.append(n)
        return periods
