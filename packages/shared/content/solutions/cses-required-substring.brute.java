import java.util.*;

public class Solution {
    private int totalCount = 0;
    private StringBuilder cur = new StringBuilder();
    private static final int MOD = 1000000007;

    private void backtrack(int n, String pattern) {
        if (cur.length() == n) {
            if (cur.indexOf(pattern) != -1) {
                totalCount = (totalCount + 1) % MOD;
            }
            return;
        }
        for (char c = 'A'; c <= 'Z'; c++) {
            cur.append(c);
            backtrack(n, pattern);
            cur.setLength(cur.length() - 1);
        }
    }

    public int requiredSubstring(int n, String pattern) {
        int m = pattern.length();
        if (n <= 4) {
            totalCount = 0;
            cur.setLength(0);
            backtrack(n, pattern);
            return totalCount;
        }

        int[] pi = new int[m];
        for (int i = 1; i < m; i++) {
            int j = pi[i - 1];
            while (j > 0 && pattern.charAt(i) != pattern.charAt(j)) j = pi[j - 1];
            if (pattern.charAt(i) == pattern.charAt(j)) j++;
            pi[i] = j;
        }

        int[][] aut = new int[m][26];
        for (int state = 0; state < m; state++) {
            for (int c = 0; c < 26; c++) {
                char ch = (char)('A' + c);
                int j = state;
                while (j > 0 && ch != pattern.charAt(j)) j = pi[j - 1];
                if (ch == pattern.charAt(j)) j++;
                aut[state][c] = j;
            }
        }

        int[] dp = new int[m];
        dp[0] = 1;

        for (int step = 0; step < n; step++) {
            int[] next_dp = new int[m];
            for (int state = 0; state < m; state++) {
                if (dp[state] == 0) continue;
                for (int c = 0; c < 26; c++) {
                    int nxt = aut[state][c];
                    if (nxt < m) {
                        next_dp[nxt] = (next_dp[nxt] + dp[state]) % MOD;
                    }
                }
            }
            dp = next_dp;
        }

        long total = 1;
        for (int i = 0; i < n; i++) total = (total * 26) % MOD;
        long without = 0;
        for (int state = 0; state < m; state++) without = (without + dp[state]) % MOD;

        long ans = (total - without + MOD) % MOD;
        return (int)ans;
    }
}
