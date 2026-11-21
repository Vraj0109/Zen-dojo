class Solution:
    def findingBorders(self, s: str) -> list[int]:
        n = len(s)
        borders = []
        for length in range(1, n):
            if s[:length] == s[n - length:]:
                borders.append(length)
        return borders
