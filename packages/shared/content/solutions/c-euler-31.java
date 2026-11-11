import java.util.List;

class Solution {
    public int coinWays(int[] coins, int target) {
        long MOD = 1000000007L;
        long[] ways = new long[target + 1];
        ways[0] = 1;
        for (int c : coins) {
            for (int s = c; s <= target; s++) {
                ways[s] = (ways[s] + ways[s - c]) % MOD;
            }
        }
        return (int)ways[target];
    }
}
