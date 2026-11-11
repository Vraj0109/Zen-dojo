class Solution {
    public int planinaPoints(int n) {
        long side = (1L << n) + 1;
        return (int)(side * side);
    }
}
