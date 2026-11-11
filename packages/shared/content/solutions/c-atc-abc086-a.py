class Solution:
    def productParity(self, a: int, b: int) -> str:
        return "Odd" if (a % 2 == 1 and b % 2 == 1) else "Even"
