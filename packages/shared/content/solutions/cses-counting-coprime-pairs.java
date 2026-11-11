import java.util.*;

class Solution {
    public long countingCoprimePairs(int[] arr) {
        int maxVal = 0;
        for (int x : arr) if (x > maxVal) maxVal = x;
        if (maxVal < 1) return 0;
        int[] mu = new int[maxVal + 1];
        List<Integer> primes = new ArrayList<>();
        boolean[] isPrime = new boolean[maxVal + 1];
        Arrays.fill(isPrime, true);
        mu[1] = 1;
        for (int i = 2; i <= maxVal; i++) {
            if (isPrime[i]) {
                primes.add(i);
                mu[i] = -1;
            }
            for (int p : primes) {
                if ((long) i * p > maxVal) break;
                isPrime[i * p] = false;
                if (i % p == 0) {
                    mu[i * p] = 0;
                    break;
                } else {
                    mu[i * p] = -mu[i];
                }
            }
        }
        int[] freq = new int[maxVal + 1];
        for (int x : arr) freq[x]++;
        long totalCoprime = 0;
        for (int d = 1; d <= maxVal; d++) {
            if (mu[d] == 0) continue;
            long cnt = 0;
            for (int mult = d; mult <= maxVal; mult += d) {
                cnt += freq[mult];
            }
            long pairs = cnt * (cnt - 1) / 2;
            totalCoprime += (long) mu[d] * pairs;
        }
        return totalCoprime;
    }
}