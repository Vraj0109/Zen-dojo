class Solution {
    public int countingDivisors(int x) {
        int count = 0;
        for (int d = 1; d <= x; d++) {
            if (x % d == 0) count++;
        }
        return count;
    }
}
