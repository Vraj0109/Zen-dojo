#include <vector>
#include <algorithm>

class Solution {
public:
    int jump(std::vector<int>& nums) {
        int n = nums.size();
        std::vector<int> dp(n, 1e9);
        dp[0] = 0;
        for (int i = 0; i < n; i++) {
            for (int j = 1; j <= nums[i] && i + j < n; j++) {
                dp[i + j] = std::min(dp[i + j], dp[i] + 1);
            }
        }
        return dp[n - 1];
    }
};
