#include <vector>
#include <algorithm>

class Solution {
public:
    int maxSubarraySumCircular(std::vector<int>& nums) {
        int n = nums.size();
        int best = nums[0];
        for (int i = 0; i < n; i++) {
            int sum = 0;
            for (int len = 1; len <= n; len++) {
                sum += nums[(i + len - 1) % n];
                best = std::max(best, sum);
            }
        }
        return best;
    }
};
