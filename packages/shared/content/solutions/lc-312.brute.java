import java.util.*;

class Solution {
    private int maxCoinsRec(List<Integer> arr) {
        if (arr.size() == 2) return 0;
        int best = 0;
        for (int i = 1; i < arr.size() - 1; i++) {
            int coins = arr.get(i - 1) * arr.get(i) * arr.get(i + 1);
            List<Integer> nextArr = new ArrayList<>(arr);
            nextArr.remove(i);
            best = Math.max(best, coins + maxCoinsRec(nextArr));
        }
        return best;
    }

    public int maxCoins(int[] nums) {
        List<Integer> arr = new ArrayList<>();
        arr.add(1);
        for (int x : nums) arr.add(x);
        arr.add(1);
        return maxCoinsRec(arr);
    }
}
