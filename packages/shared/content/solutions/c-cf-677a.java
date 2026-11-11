class Solution {
    public int fenceWidth(int[] heights, int h) {
        int w = 0;
        for (int x : heights) w += x > h ? 2 : 1;
        return w;
    }
}
