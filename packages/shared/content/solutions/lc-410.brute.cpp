#include <vector>
#include <algorithm>

class Solution {
public:
    int splitArray(std::vector<int>& nums, int k) {
        int n = nums.size();
        std::vector<long long> prefix(n + 1, 0);
        for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + nums[i];

        std::vector<std::vector<long long>> dp(k + 1, std::vector<long long>(n + 1, 1e18));
        dp[0][0] = 0;

        for (int j = 1; j <= k; j++) {
            for (int i = 1; i <= n; i++) {
                for (int p = 0; p < i; p++) {
                    long long part_sum = prefix[i] - prefix[p];
                    dp[j][i] = std::min(dp[j][i], std::max(dp[j - 1][p], part_sum));
                }
            }
        }
        return (int)dp[k][n];
    }
};
