class Solution {
    public long tripletProduct(int p) {
        long best = -1;
        for (long a = 1; a <= p / 3; a++) {
            long num = (long) p * (p - 2 * a), den = 2 * (p - a);
            if (num % den != 0) continue;
            long b = num / den, c = p - a - b;
            if (a < b && b < c && a * a + b * b == c * c) best = Math.max(best, a * b * c);
        }
        return best;
    }
}
