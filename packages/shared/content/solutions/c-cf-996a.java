class Solution {
    public int minimumBills(int n) {
        int bills = 0;
        int[] denom = {100, 20, 10, 5, 1};
        for (int d : denom) {
            bills += n / d;
            n %= d;
        }
        return bills;
    }
}
