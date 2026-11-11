import java.math.BigInteger;

class Solution {
    private static boolean isPrime(long n) {
        if (n < 2) return false;
        long[] small = {2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37};
        for (long p : small) {
            if (n % p == 0) return n == p;
        }
        return BigInteger.valueOf(n).isProbablePrime(20);
    }

    public int spiralPrimeSide(int percent) {
        long primes = 0;
        for (long s = 3;; s += 2) {
            for (int k = 1; k <= 3; k++) {
                if (isPrime(s * s - k * (s - 1))) primes++;
            }
            if (primes * 100 < (long)percent * (2 * s - 1)) return (int)s;
        }
    }
}
