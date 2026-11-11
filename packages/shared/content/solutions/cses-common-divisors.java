class Solution {
    public int commonDivisors(int[] arr) {
        int maxVal = 0;
        for (int x : arr) if (x > maxVal) maxVal = x;
        int[] cnt = new int[maxVal + 1];
        for (int x : arr) cnt[x]++;
        for (int g = maxVal; g >= 1; g--) {
            int multiples = 0;
            for (int k = g; k <= maxVal; k += g) {
                multiples += cnt[k];
                if (multiples >= 2) return g;
            }
        }
        return 1;
    }
}
