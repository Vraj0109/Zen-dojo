#include <vector>
#include <algorithm>

class Solution {
    int dfs(const std::vector<int>& nums, int i) {
        if (i >= (int)nums.size()) return 0;
        int rob_this = nums[i] + dfs(nums, i + 2);
        int skip_this = dfs(nums, i + 1);
        return std::max(rob_this, skip_this);
    }
public:
    int rob(std::vector<int>& nums) {
        return dfs(nums, 0);
    }
};
