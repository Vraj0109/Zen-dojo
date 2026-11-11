class Solution:
    def helpfulMaths(self, s: str) -> str:
        nums = sorted(s.replace("+", ""))
        return "+".join(nums)
