#include <vector>
#include <algorithm>

class Solution {
public:
    int ferrisWheel(std::vector<int>& weights, int x) {
        std::sort(weights.begin(), weights.end());
        int left = 0, right = (int)weights.size() - 1;
        int gondolas = 0;
        while (left <= right) {
            if (left < right && weights[left] + weights[right] <= x) {
                left++;
            }
            right--;
            gondolas++;
        }
        return gondolas;
    }
};
