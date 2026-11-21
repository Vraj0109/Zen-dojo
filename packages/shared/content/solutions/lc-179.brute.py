import itertools

class Solution:
    def largestNumber(self, nums: list[int]) -> str:
        s = [str(x) for x in nums]
        best = ""
        for p in itertools.permutations(s):
            cand = "".join(p)
            if cand > best:
                best = cand
        if best and best[0] == "0":
            return "0"
        return best
