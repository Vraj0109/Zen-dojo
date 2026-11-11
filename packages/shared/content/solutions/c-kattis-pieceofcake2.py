class Solution:
    def largestCakeVolume(self, n: int, h: int, v: int) -> int:
        side1 = max(h, n - h)
        side2 = max(v, n - v)
        return side1 * side2 * 4
