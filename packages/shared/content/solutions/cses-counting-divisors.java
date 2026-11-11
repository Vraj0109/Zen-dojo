class Solution {
    public int countingDivisors(int x) {
        int count = 0;
        for (int d = 1; d * d <= x; d++) {
            if (x % d == 0) {
                if (d * d == x) count += 1;
                else count += 2;
            }
        }
        return count;
    }
}
