class Solution:
    def partition(self, s: str) -> list[list[str]]:
        res = []
        cur = []
        n = len(s)

        def is_palindrome(l: int, r: int) -> bool:
            while l < r:
                if s[l] != s[r]:
                    return False
                l += 1
                r -= 1
            return True

        def backtrack(start: int) -> None:
            if start == n:
                res.append(list(cur))
                return
            for end in range(start, n):
                if is_palindrome(start, end):
                    cur.append(s[start:end + 1])
                    backtrack(end + 1)
                    cur.pop()

        backtrack(0)
        return res
