#include <vector>
#include <algorithm>
#include <set>

class Solution {
public:
    std::vector<std::vector<int>> threeSum(std::vector<int>& nums) {
        int n = nums.size();
        std::set<std::vector<int>> unique_triplets;
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                for (int k = j + 1; k < n; k++) {
                    if (nums[i] + nums[j] + nums[k] == 0) {
                        std::vector<int> t = {nums[i], nums[j], nums[k]};
                        std::sort(t.begin(), t.end());
                        unique_triplets.insert(t);
                    }
                }
            }
        }
        return std::vector<std::vector<int>>(unique_triplets.begin(), unique_triplets.end());
    }
};
