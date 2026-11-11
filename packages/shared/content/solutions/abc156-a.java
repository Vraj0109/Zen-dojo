class Solution {
    public int trueRating(int n, int r) {
        return n >= 10 ? r : r + 100 * (10 - n);
    }
}
