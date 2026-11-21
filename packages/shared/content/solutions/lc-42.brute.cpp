#include <vector>
#include <algorithm>

class Solution {
public:
    int trap(std::vector<int>& height) {
        int n = height.size();
        int water = 0;
        for (int i = 0; i < n; i++) {
            int left_max = 0;
            for (int j = 0; j <= i; j++) left_max = std::max(left_max, height[j]);
            int right_max = 0;
            for (int j = i; j < n; j++) right_max = std::max(right_max, height[j]);
            water += std::min(left_max, right_max) - height[i];
        }
        return water;
    }
};
