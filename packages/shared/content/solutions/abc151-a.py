class Solution:
    def nextLetter(self, c: str) -> str:
        return chr(ord(c[0]) + 1)
