#include <vector>

class Solution {
public:
    int coinCombinationsI(std::vector<int>& coins, int target) {
        const int MOD = 1e9 + 7;
        std::vector<int> dp(target + 1, 0);
        dp[0] = 1;
        for (int i = 1; i <= target; i++) {
            for (int c : coins) {
                if (i >= c) {
                    dp[i] = (dp[i] + dp[i - c]) % MOD;
                }
            }
        }
        return dp[target];
    }
};
