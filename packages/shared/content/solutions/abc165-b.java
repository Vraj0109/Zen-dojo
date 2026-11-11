class Solution {
    public int yearsToReach(long x) {
        long b = 100;
        int years = 0;
        while (b < x) {
            b += b / 100;
            years++;
        }
        return years;
    }
}
