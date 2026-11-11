class Solution {
    private static boolean isPrime(long v) {
        if (v < 2) return false;
        for (long d = 2; d * d <= v; d++) {
            if (v % d == 0) return false;
        }
        return true;
    }

    public int quadraticPrimes(int aMax, int bMax) {
        int bestLen = -1, bestProd = 0;
        for (int b = 2; b <= bMax; b++) {
            if (!isPrime(b)) continue;
            for (int a = -(aMax - 1); a <= aMax - 1; a++) {
                int n = 0;
                while (isPrime((long)n * n + (long)a * n + b)) n++;
                int prod = a * b;
                if (n > bestLen || (n == bestLen && prod > bestProd)) {
                    bestLen = n;
                    bestProd = prod;
                }
            }
        }
        return bestProd;
    }
}
