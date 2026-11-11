class Solution:
    def detectHiss(self, s: str) -> str:
        return "hiss" if "ss" in s else "no hiss"
