class Solution:
    def hasBus(self, s: str) -> str:
        return "Yes" if "A" in s and "B" in s else "No"
