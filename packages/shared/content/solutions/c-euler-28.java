class Solution {
    public long spiralDiagonals(int side) {
        long total = 1;
        for (long s = 3; s <= side; s += 2) {
            total += 4 * s * s - 6 * (s - 1);
        }
        return total;
    }
}
