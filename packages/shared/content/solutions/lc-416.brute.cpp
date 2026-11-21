#include <vector>
#include <numeric>

class Solution {
    bool dfs(const std::vector<int>& nums, int i, int target) {
        if (target == 0) return true;
        if (target < 0 || i >= (int)nums.size()) return false;
        return dfs(nums, i + 1, target - nums[i]) || dfs(nums, i + 1, target);
    }
public:
    bool canPartition(std::vector<int>& nums) {
        int total = std::accumulate(nums.begin(), nums.end(), 0);
        if (total % 2 != 0) return false;
        return dfs(nums, 0, total / 2);
    }
};
