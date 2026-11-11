class Solution:
    def canSplitWatermelon(self, w: int) -> bool:
        return w % 2 == 0 and w > 2
