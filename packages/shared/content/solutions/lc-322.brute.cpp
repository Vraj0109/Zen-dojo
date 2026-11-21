#include <vector>
#include <algorithm>

class Solution {
    int dfs(const std::vector<int>& coins, int amount) {
        if (amount == 0) return 0;
        if (amount < 0) return -1;
        int min_coins = -1;
        for (int c : coins) {
            int sub = dfs(coins, amount - c);
            if (sub >= 0) {
                if (min_coins == -1 || sub + 1 < min_coins) {
                    min_coins = sub + 1;
                }
            }
        }
        return min_coins;
    }
public:
    int coinChange(std::vector<int>& coins, int amount) {
        return dfs(coins, amount);
    }
};
