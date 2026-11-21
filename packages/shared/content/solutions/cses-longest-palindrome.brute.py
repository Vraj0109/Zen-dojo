class Solution:
    def longestPalindrome(self, s: str) -> str:
        n = len(s)
        if n <= 1:
            return s
        max_len = 0
        best_start = 0

        def expand(l: int, r: int):
            nonlocal max_len, best_start
            while l >= 0 and r < n and s[l] == s[r]:
                l -= 1
                r += 1
            length = r - l - 1
            if length > max_len:
                max_len = length
                best_start = l + 1

        for i in range(n):
            expand(i, i)
            expand(i, i + 1)

        return s[best_start:best_start + max_len]
