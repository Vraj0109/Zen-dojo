class Solution {
    public int shiftOnly(int[] a) {
        int best = 100;
        for (int x : a) {
            int c = 0;
            while (x % 2 == 0) {
                x /= 2;
                c++;
            }
            best = Math.min(best, c);
        }
        return best;
    }
}
