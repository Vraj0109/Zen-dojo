class Solution:
    def rotN(self, n: int, s: str) -> str:
        return "".join(chr(ord('A') + (ord(c) - ord('A') + n) % 26) for c in s)
