import java.math.BigInteger;

class Solution {
    public long lastDigits(long a, long e, int k) {
        BigInteger M = BigInteger.TEN.pow(k);
        BigInteger base = BigInteger.valueOf(2).mod(M);
        BigInteger r = base.modPow(BigInteger.valueOf(e), M);
        BigInteger v = BigInteger.valueOf(a).mod(M).multiply(r).mod(M);
        return v.add(BigInteger.ONE).mod(M).longValue();
    }
}
