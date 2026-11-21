#include <vector>
#include <algorithm>

class Solution {
public:
    long long maximumSubarraySum(std::vector<int>& arr) {
        int n = arr.size();
        long long best = arr[0];
        for (int i = 0; i < n; i++) {
            long long current_sum = 0;
            for (int j = i; j < n; j++) {
                current_sum += arr[j];
                best = std::max(best, current_sum);
            }
        }
        return best;
    }
};
