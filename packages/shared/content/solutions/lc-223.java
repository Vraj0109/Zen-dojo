class Solution {
    public int computeArea(int ax1, int ay1, int ax2, int ay2, int bx1, int by1, int bx2, int by2) {
        long a = (long) (ax2 - ax1) * (ay2 - ay1);
        long b = (long) (bx2 - bx1) * (by2 - by1);
        long w = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
        long h = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
        return (int) (a + b - w * h);
    }
}