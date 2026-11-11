import java.util.Arrays;

class Solution {
    public int cardGame(int[] cards) {
        Arrays.sort(cards);
        int diff = 0;
        int n = cards.length;
        for (int i = 0; i < n; i++) {
            int val = cards[n - 1 - i];
            diff += (i % 2 == 0) ? val : -val;
        }
        return diff;
    }
}
