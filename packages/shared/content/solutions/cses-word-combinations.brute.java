import java.util.*;

public class Solution {
    public int wordCombinations(String s, String[] words) {
        int n = s.length();
        int MOD = 1000000007;
        int[] dp = new int[n + 1];
        dp[0] = 1;

        for (int i = 0; i < n; i++) {
            if (dp[i] == 0) continue;
            for (String w : words) {
                int len = w.length();
                if (i + len <= n && s.startsWith(w, i)) {
                    dp[i + len] = (dp[i + len] + dp[i]) % MOD;
                }
            }
        }
        return dp[n];
    }
}
