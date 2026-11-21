#include <vector>

class Solution {
public:
    int cardGame(std::vector<int>& cards) {
        int n = cards.size();
        std::vector<bool> used(n, false);
        int alice = 0, bob = 0;
        for (int turn = 0; turn < n; turn++) {
            int max_idx = -1;
            for (int i = 0; i < n; i++) {
                if (!used[i]) {
                    if (max_idx == -1 || cards[i] > cards[max_idx]) {
                        max_idx = i;
                    }
                }
            }
            used[max_idx] = true;
            if (turn % 2 == 0) alice += cards[max_idx];
            else bob += cards[max_idx];
        }
        return alice - bob;
    }
};
