class Solution {
    public int countNumbersWithUniqueDigits(int n) {
        if (n == 0) return 1;
        int total = 10, cur = 9, avail = 9;
        for (int k = 2; k <= Math.min(n, 10); k++) {
            cur *= avail;
            avail--;
            total += cur;
        }
        return total;
    }
}