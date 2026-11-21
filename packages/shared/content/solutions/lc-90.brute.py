class Solution:
    def subsetsWithDup(self, nums: list[int]) -> list[list[int]]:
        nums.sort()
        n = len(nums)
        seen = set()
        res = []
        for mask in range(1 << n):
            sub = tuple(nums[i] for i in range(n) if (mask & (1 << i)))
            if sub not in seen:
                seen.add(sub)
                res.append(list(sub))
        return res
