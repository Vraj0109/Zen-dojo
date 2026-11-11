class Solution {
    public int tarifa(int x, int[] used) {
        int total = x * (used.length + 1);
        for (int u : used) total -= u;
        return total;
    }
}
