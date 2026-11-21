#include <vector>

class Solution {
public:
    int twoSetsII(int n) {
        long long total = 1LL * n * (n + 1) / 2;
        if (total % 2 != 0) return 0;
        int target = total / 2;
        const int MOD = 1e9 + 7;
        std::vector<int> dp(target + 1, 0);
        dp[0] = 1;
        for (int i = 1; i < n; i++) {
            for (int j = target; j >= i; j--) {
                dp[j] = (dp[j] + dp[j - i]) % MOD;
            }
        }
        return dp[target];
    }
};
