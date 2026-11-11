class Solution {
    public int oddDigitCount(int n) {
        long lo = 1;
        int total = 0;
        for (int d = 1; d <= 9; d++) {
            long hi = lo * 10 - 1;
            if (d % 2 == 1 && n >= lo) {
                total += (int)(Math.min((long)n, hi) - lo + 1);
            }
            lo *= 10;
        }
        return total;
    }
}
