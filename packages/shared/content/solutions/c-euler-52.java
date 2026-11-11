import java.util.Arrays;

class Solution {
    private static String sig(long v) {
        char[] s = Long.toString(v).toCharArray();
        Arrays.sort(s);
        return new String(s);
    }

    public int permutedMultiples(int k) {
        for (int x = 1;; x++) {
            String base = sig(x);
            boolean ok = true;
            for (int m = 2; m <= k && ok; m++) {
                if (!sig((long)x * m).equals(base)) ok = false;
            }
            if (ok) return x;
        }
    }
}
