class Solution:
    def containsNearbyAlmostDuplicate(self, nums: list[int], indexDiff: int, valueDiff: int) -> bool:
        n = len(nums)
        for i in range(n):
            for j in range(i + 1, min(n, i + indexDiff + 1)):
                if abs(nums[i] - nums[j]) <= valueDiff:
                    return True
        return False
