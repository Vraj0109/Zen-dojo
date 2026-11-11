import java.util.*;

class Solution {
    public int[] moneySums(int[] coins) {
        int total = 0;
        for (int c : coins) total += c;
        boolean[] dp = new boolean[total + 1];
        dp[0] = true;
        int currentMax = 0;
        for (int c : coins) {
            for (int s = currentMax; s >= 0; s--) {
                if (dp[s]) dp[s + c] = true;
            }
            currentMax += c;
        }
        List<Integer> res = new ArrayList<>();
        for (int s = 1; s <= total; s++) {
            if (dp[s]) res.add(s);
        }
        int[] out = new int[res.size()];
        for (int i = 0; i < res.size(); i++) out[i] = res.get(i);
        return out;
    }
}
