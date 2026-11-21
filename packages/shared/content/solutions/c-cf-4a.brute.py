class Solution:
    def canSplitWatermelon(self, w: int) -> bool:
        for w1 in range(1, w):
            w2 = w - w1
            if w1 % 2 == 0 and w2 % 2 == 0:
                return True
        return False
