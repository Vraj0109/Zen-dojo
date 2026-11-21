class Solution {
    public int cardGame(int[] cards) {
        int n = cards.length;
        boolean[] used = new boolean[n];
        int alice = 0, bob = 0;
        for (int turn = 0; turn < n; turn++) {
            int maxIdx = -1;
            for (int i = 0; i < n; i++) {
                if (!used[i]) {
                    if (maxIdx == -1 || cards[i] > cards[maxIdx]) {
                        maxIdx = i;
                    }
                }
            }
            used[maxIdx] = true;
            if (turn % 2 == 0) alice += cards[maxIdx];
            else bob += cards[maxIdx];
        }
        return alice - bob;
    }
}
