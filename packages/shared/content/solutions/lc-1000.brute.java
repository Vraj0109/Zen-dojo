import java.util.*;

class Solution {
    private int[][] memo;

    private int solve(int i, int j, int k, int[] pre) {
        if (i == j) return 0;
        if (memo[i][j] != -1) return memo[i][j];

        int ans = (int) 1e9;
        for (int m = i; m < j; m += k - 1) {
            ans = Math.min(ans, solve(i, m, k, pre) + solve(m + 1, j, k, pre));
        }

        if ((j - i) % (k - 1) == 0) {
            ans += pre[j + 1] - pre[i];
        }
        return memo[i][j] = ans;
    }

    public int mergeStones(int[] stones, int k) {
        int n = stones.length;
        if ((n - 1) % (k - 1) != 0) return -1;

        int[] pre = new int[n + 1];
        for (int i = 0; i < n; i++) pre[i + 1] = pre[i] + stones[i];

        memo = new int[n][n];
        for (int i = 0; i < n; i++) {
            Arrays.fill(memo[i], -1);
        }

        return solve(0, n - 1, k, pre);
    }
}
