import java.util.Arrays;

class Solution {
    public String minimalRotation(String s) {
        int n = s.length();
        String S = s + s;
        int[] f = new int[2 * n];
        Arrays.fill(f, -1);
        int k = 0;
        for (int j = 1; j < 2 * n; j++) {
            char sj = S.charAt(j);
            int i = f[j - k - 1];
            while (i != -1 && sj != S.charAt(k + i + 1)) {
                if (sj < S.charAt(k + i + 1)) k = j - i - 1;
                i = f[i];
            }
            if (sj != S.charAt(k + i + 1)) {
                if (sj < S.charAt(k)) k = j;
                f[j - k] = -1;
            } else {
                f[j - k] = i + 1;
            }
        }
        return S.substring(k, k + n);
    }
}
