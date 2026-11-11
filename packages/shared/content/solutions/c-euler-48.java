import java.math.BigInteger;

class Solution {
    public long selfPowersTail(int n, int digits) {
        BigInteger m = BigInteger.TEN.pow(digits);
        BigInteger total = BigInteger.ZERO;
        for (int k = 1; k <= n; k++) {
            BigInteger bk = BigInteger.valueOf(k);
            BigInteger term = bk.modPow(bk, m);
            total = total.add(term).mod(m);
        }
        return total.longValue();
    }
}
