class Solution {
    public long numberSpiral(long y, long x) {
        long z = Math.max(y, x);
        long z2 = (z - 1) * (z - 1);
        if (z % 2 == 0) {
            return (y == z) ? z * z - x + 1 : z2 + y;
        } else {
            return (x == z) ? z * z - y + 1 : z2 + x;
        }
    }
}
