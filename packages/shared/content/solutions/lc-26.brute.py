class Solution:
    def removeDuplicates(self, nums: list[int]) -> list[int]:
        seen = set()
        res = []
        for x in nums:
            if x not in seen:
                seen.add(x)
                res.append(x)
        return res
