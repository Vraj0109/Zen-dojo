class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen: dict[int, int] = {}
        for i, v in enumerate(nums):
            comp = target - v
            if comp in seen:
                return [seen[comp], i]
            seen[v] = i
        return []
