#include <vector>

class Solution {
public:
    int fenceStart(std::vector<int>& h, int k) {
        int n = h.size();
        int best_sum = 2e9;
        int best_idx = 1;
        for (int i = 0; i <= n - k; i++) {
            int current_sum = 0;
            for (int j = 0; j < k; j++) {
                current_sum += h[i + j];
            }
            if (current_sum < best_sum) {
                best_sum = current_sum;
                best_idx = i + 1;
            }
        }
        return best_idx;
    }
};
