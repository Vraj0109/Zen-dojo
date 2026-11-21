class Solution:
    def minCut(self, s: str) -> int:
        n = len(s)

        def is_palindrome(l: int, r: int) -> bool:
            while l < r:
                if s[l] != s[r]:
                    return False
                l += 1
                r -= 1
            return True

        def backtrack(start: int) -> int:
            if is_palindrome(start, n - 1):
                return 0
            min_cuts = n - start - 1
            for end in range(start, n):
                if is_palindrome(start, end):
                    min_cuts = min(min_cuts, 1 + backtrack(end + 1))
            return min_cuts

        return backtrack(0)
