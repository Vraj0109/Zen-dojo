#include <vector>

class Solution {
public:
    int diceCombinations(int n) {
        const int MOD = 1e9 + 7;
        std::vector<int> dp(n + 1, 0);
        dp[0] = 1;
        for (int i = 1; i <= n; i++) {
            for (int d = 1; d <= 6; d++) {
                if (i >= d) {
                    dp[i] = (dp[i] + dp[i - d]) % MOD;
                }
            }
        }
        return dp[n];
    }
};
