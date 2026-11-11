import java.util.*;

class Solution {
    public int numberWays(int[][] hats) {
        int n = hats.length;
        int MOD = 1_000_000_007;
        List<List<Integer>> hatToPeople = new ArrayList<>();
        for (int i = 0; i <= 40; i++) hatToPeople.add(new ArrayList<>());
        for (int p = 0; p < n; p++) {
            for (int h : hats[p]) {
                hatToPeople.get(h).add(p);
            }
        }

        int targetMask = (1 << n) - 1;
        int[] dp = new int[1 << n];
        dp[0] = 1;

        for (int h = 1; h <= 40; h++) {
            int[] nextDp = dp.clone();
            for (int p : hatToPeople.get(h)) {
                int pBit = 1 << p;
                for (int mask = 0; mask <= targetMask; mask++) {
                    if ((mask & pBit) == 0 && dp[mask] > 0) {
                        nextDp[mask | pBit] = (int)((nextDp[mask | pBit] + (long)dp[mask]) % MOD);
                    }
                }
            }
            dp = nextDp;
        }

        return dp[targetMask];
    }
}
