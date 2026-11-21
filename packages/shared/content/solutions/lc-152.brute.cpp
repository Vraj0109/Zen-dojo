#include <vector>
#include <algorithm>

class Solution {
public:
    int maxProduct(std::vector<int>& nums) {
        int n = nums.size();
        int best = nums[0];
        for (int i = 0; i < n; i++) {
            long long prod = 1;
            for (int j = i; j < n; j++) {
                prod *= nums[j];
                if (prod > best) best = prod;
                // prevent overflow on extreme cases
                if (prod > 1e14 || prod < -1e14) break;
            }
        }
        return best;
    }
};
