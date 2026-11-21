import java.util.*;

public class Solution {
    private int n;
    private int ways = 0;
    private static final int MOD = 1_000_000_007;

    private void backtrack(int[][] hats, int person, Set<Integer> usedHats) {
        if (person == n) {
            ways = (ways + 1) % MOD;
            return;
        }
        for (int h : hats[person]) {
            if (!usedHats.contains(h)) {
                usedHats.add(h);
                backtrack(hats, person + 1, usedHats);
                usedHats.remove(h);
            }
        }
    }

    public int numberWays(int[][] hats) {
        n = hats.length;
        ways = 0;
        Set<Integer> usedHats = new HashSet<>();
        backtrack(hats, 0, usedHats);
        return ways;
    }
}
