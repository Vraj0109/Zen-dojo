class Solution {
    public int requiredSubstring(int n, String pattern) {
        int m = pattern.length();
        int MOD = 1000000007;

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
        for (int i = 0; i < n; i++) {
            total = (total * 26) % MOD;
        }

        long without = 0;
        for (int state = 0; state < m; state++) {
            without = (without + dp[state]) % MOD;
        }

        long ans = (total - without + MOD) % MOD;
        return (int)ans;
    }
}
