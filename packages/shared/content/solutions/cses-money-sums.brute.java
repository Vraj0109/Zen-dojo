import java.util.*;

class Solution {
    public int[] moneySums(int[] coins) {
        BitSet bs = new BitSet(100001);
        bs.set(0);
        int maxSum = 0;
        for (int c : coins) {
            for (int s = maxSum; s >= 0; s--) {
                if (bs.get(s) && s + c <= 100000) {
                    bs.set(s + c);
                }
            }
            maxSum = Math.min(100000, maxSum + c);
        }
        List<Integer> list = new ArrayList<>();
        for (int s = 1; s <= maxSum; s++) {
            if (bs.get(s)) list.add(s);
        }
        int[] res = new int[list.size()];
        for (int i = 0; i < list.size(); i++) res[i] = list.get(i);
        return res;
    }
}
