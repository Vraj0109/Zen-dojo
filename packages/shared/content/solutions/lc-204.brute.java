class Solution {
    private boolean isPrime(int x) {
        if (x < 2) return false;
        for (int d = 2; (long) d * d <= x; d++) {
            if (x % d == 0) return false;
        }
        return true;
    }

    public int countPrimes(int n) {
        int count = 0;
        for (int i = 2; i < n; i++) {
            if (isPrime(i)) count++;
        }
        return count;
    }
}
