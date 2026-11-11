class Solution:
    def repetitions(self, s: str) -> int:
        best = 1
        run = 1
        for i in range(1, len(s)):
            run = run + 1 if s[i] == s[i - 1] else 1
            best = max(best, run)
        return best
