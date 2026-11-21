class Solution:
    def longestValidParentheses(self, s: str) -> int:
        def is_valid(start: int, end: int) -> bool:
            bal = 0
            for i in range(start, end + 1):
                if s[i] == '(':
                    bal += 1
                else:
                    bal -= 1
                if bal < 0:
                    return False
            return bal == 0

        n = len(s)
        max_len = 0
        for i in range(n):
            for j in range(i + 1, n, 2):
                if j - i + 1 > max_len and is_valid(i, j):
                    max_len = j - i + 1
        return max_len
