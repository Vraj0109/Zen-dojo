#include <vector>
#include <algorithm>

class Solution {
    int dfs(const std::vector<int>& prices, int i, bool holding) {
        if (i >= (int)prices.size()) return 0;
        int best = dfs(prices, i + 1, holding);
        if (holding) {
            best = std::max(best, prices[i] + dfs(prices, i + 1, false));
        } else {
            best = std::max(best, -prices[i] + dfs(prices, i + 1, true));
        }
        return best;
    }
public:
    int maxProfit(std::vector<int>& prices) {
        return dfs(prices, 0, false);
    }
};
