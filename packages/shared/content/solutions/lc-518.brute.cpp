#include <vector>

class Solution {
    int dfs(int amount, const std::vector<int>& coins, int idx) {
        if (amount == 0) return 1;
        if (amount < 0 || idx >= (int)coins.size()) return 0;
        return dfs(amount - coins[idx], coins, idx) + dfs(amount, coins, idx + 1);
    }
public:
    int change(int amount, std::vector<int>& coins) {
        return dfs(amount, coins, 0);
    }
};
