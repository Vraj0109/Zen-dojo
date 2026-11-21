import itertools

class Solution:
    def permuteUnique(self, nums: list[int]) -> list[list[int]]:
        return [list(p) for p in set(itertools.permutations(nums))]
