import java.util.*;

class Solution {
    public int minSessions(int[] tasks, int sessionTime) {
        int n = tasks.length;
        int[][] dp = new int[1 << n][2];
        for (int i = 0; i < (1 << n); i++) {
            dp[i][0] = Integer.MAX_VALUE;
            dp[i][1] = Integer.MAX_VALUE;
        }
        dp[0][0] = 1;
        dp[0][1] = 0;
        for (int mask = 0; mask < (1 << n); mask++) {
            if (dp[mask][0] == Integer.MAX_VALUE) continue;
            for (int i = 0; i < n; i++) {
                if ((mask & (1 << i)) != 0) continue;
                int sessions = dp[mask][0];
                int time = dp[mask][1];
                if (time + tasks[i] <= sessionTime) {
                    time += tasks[i];
                } else {
                    sessions++;
                    time = tasks[i];
                }
                int nm = mask | (1 << i);
                if (sessions < dp[nm][0] || (sessions == dp[nm][0] && time < dp[nm][1])) {
                    dp[nm][0] = sessions;
                    dp[nm][1] = time;
                }
            }
        }
        return dp[(1 << n) - 1][0];
    }
}