class Solution:
    def interleave(self, s: str, t: str) -> str:
        return "".join(a + b for a, b in zip(s, t))
