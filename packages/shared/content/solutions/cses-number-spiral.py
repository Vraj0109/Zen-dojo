class Solution:
    def numberSpiral(self, y: int, x: int) -> int:
        z = max(y, x)
        z2 = (z - 1) * (z - 1)
        if z % 2 == 0:
            return z * z - x + 1 if y == z else z2 + y
        else:
            return z * z - y + 1 if x == z else z2 + x
