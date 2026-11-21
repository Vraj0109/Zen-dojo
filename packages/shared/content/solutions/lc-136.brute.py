class Solution:
    def singleNumber(self, nums: list[int]) -> int:
        seen = set()
        for x in nums:
            if x in seen:
                seen.remove(x)
            else:
                seen.add(x)
        return next(iter(seen))
