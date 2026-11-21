class Solution:
    def repetitions(self, s: str) -> int:
        n = len(s)
        best = 0
        for i in range(n):
            for j in range(i, n):
                all_same = True
                for k in range(i, j + 1):
                    if s[k] != s[i]:
                        all_same = False
                        break
                if all_same:
                    best = max(best, j - i + 1)
        return best
