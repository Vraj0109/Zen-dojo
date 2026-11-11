class Solution {
    public int largestCakeVolume(int n, int h, int v) {
        int side1 = Math.max(h, n - h);
        int side2 = Math.max(v, n - v);
        return side1 * side2 * 4;
    }
}
