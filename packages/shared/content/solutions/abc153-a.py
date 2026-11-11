class Solution:
    def attacksNeeded(self, h: int, a: int) -> int:
        return (h + a - 1) // a
