class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        last: dict[str, int] = {}
        left = 0
        best = 0
        for r, c in enumerate(s):
            if c in last and last[c] >= left:
                left = last[c] + 1
            last[c] = r
            best = max(best, r - left + 1)
        return best
