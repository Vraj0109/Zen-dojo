class Solution {
    public int countPrimes(int n) {
        if (n < 3) return 0;
        boolean[] comp = new boolean[n];
        for (long p = 2; p * p < n; p++) {
            if (comp[(int) p]) continue;
            for (long m = p * p; m < n; m += p) comp[(int) m] = true;
        }
        int count = 0;
        for (int i = 2; i < n; i++) if (!comp[i]) count++;
        return count;
    }
}