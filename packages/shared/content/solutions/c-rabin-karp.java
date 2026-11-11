import java.util.*;

class Solution {
    public int[] rabinKarp(String pattern, String text) {
        int pLen = pattern.length();
        int tLen = text.length();
        if (pLen > tLen || pLen == 0) return new int[0];

        final long p = 31;
        final long m = 1_000_000_009L;

        int maxLen = Math.max(pLen, tLen);
        long[] pPow = new long[maxLen + 1];
        pPow[0] = 1;
        for (int i = 1; i <= maxLen; i++) {
            pPow[i] = (pPow[i - 1] * p) % m;
        }

        long[] h = new long[tLen + 1];
        for (int i = 0; i < tLen; i++) {
            h[i + 1] = (h[i] + (long)(text.charAt(i) - 'a' + 1) * pPow[i]) % m;
        }

        long hs = 0;
        for (int i = 0; i < pLen; i++) {
            hs = (hs + (long)(pattern.charAt(i) - 'a' + 1) * pPow[i]) % m;
        }

        List<Integer> occurrences = new ArrayList<>();
        for (int i = 0; i <= tLen - pLen; i++) {
            long curH = (h[i + pLen] + m - h[i]) % m;
            if (curH == (hs * pPow[i]) % m) {
                if (text.startsWith(pattern, i)) {
                    occurrences.add(i);
                }
            }
        }
        int[] res = new int[occurrences.size()];
        for (int i = 0; i < occurrences.size(); i++) res[i] = occurrences.get(i);
        return res;
    }
}
