#include <vector>
#include <algorithm>

class Solution {
public:
    std::vector<int> maxSlidingWindow(std::vector<int>& nums, int k) {
        int n = nums.size();
        std::vector<int> ans;
        for (int i = 0; i <= n - k; i++) {
            int mx = nums[i];
            for (int j = 1; j < k; j++) {
                mx = std::max(mx, nums[i + j]);
            }
            ans.push_back(mx);
        }
        return ans;
    }
};
