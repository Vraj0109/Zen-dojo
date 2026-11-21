#include <vector>
#include <algorithm>

class Solution {
public:
    int minimizingCoins(std::vector<int>& coins, int target) {
        const int INF = 1e9;
        std::vector<int> dp(target + 1, INF);
        dp[0] = 0;
        for (int i = 1; i <= target; i++) {
            for (int c : coins) {
                if (i >= c && dp[i - c] != INF) {
                    dp[i] = std::min(dp[i], dp[i - c] + 1);
                }
            }
        }
        return dp[target] >= INF ? -1 : dp[target];
    }
};
