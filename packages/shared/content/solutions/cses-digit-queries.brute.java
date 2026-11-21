import java.math.BigInteger;

class Solution {
    public int digitQueries(String k_str) {
        long k = Long.parseLong(k_str);
        long len = 1, count = 9, start = 1;
        while (k > len * count) {
            k -= len * count;
            len++;
            count *= 10;
            start *= 10;
        }
        start += (k - 1) / len;
        String s = Long.toString(start);
        return s.charAt((int) ((k - 1) % len)) - '0';
    }
}
