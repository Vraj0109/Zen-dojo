#include <vector>

class Solution {
public:
    int coinCombinationsII(std::vector<int>& coins, int target) {
        const int MOD = 1e9 + 7;
        std::vector<int> dp(target + 1, 0);
        dp[0] = 1;
        for (int c : coins) {
            for (int i = c; i <= target; i++) {
                dp[i] = (dp[i] + dp[i - c]) % MOD;
            }
        }
        return dp[target];
    }
};
