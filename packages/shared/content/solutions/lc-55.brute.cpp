#include <vector>

class Solution {
    bool canReach(const std::vector<int>& nums, int pos) {
        if (pos >= (int)nums.size() - 1) return true;
        for (int step = 1; step <= nums[pos]; step++) {
            if (canReach(nums, pos + step)) return true;
        }
        return false;
    }
public:
    bool canJump(std::vector<int>& nums) {
        return canReach(nums, 0);
    }
};
