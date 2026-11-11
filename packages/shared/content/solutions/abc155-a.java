class Solution {
    public String isPoor(int a, int b, int c) {
        int eq = (a == b ? 1 : 0) + (b == c ? 1 : 0) + (a == c ? 1 : 0);
        return eq == 1 ? "Yes" : "No";
    }
}
