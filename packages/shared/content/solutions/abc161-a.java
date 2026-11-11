class Solution {
    public int[] abcSwap(int x, int y, int z) {
        int t = x; x = y; y = t;
        t = x; x = z; z = t;
        return new int[]{x, y, z};
    }
}
