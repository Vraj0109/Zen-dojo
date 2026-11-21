#include <vector>

using namespace std;

class Solution {
    int countWays(const vector<int>& nums, int idx, int curSum, int target) {
        if (idx == (int)nums.size()) {
            return curSum == target ? 1 : 0;
        }
        return countWays(nums, idx + 1, curSum + nums[idx], target) +
               countWays(nums, idx + 1, curSum - nums[idx], target);
    }
public:
    int findTargetSumWays(vector<int>& nums, int target) {
        return countWays(nums, 0, 0, target);
    }
};
