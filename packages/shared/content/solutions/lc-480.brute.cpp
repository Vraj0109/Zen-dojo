#include <vector>
#include <algorithm>

using namespace std;

class Solution {
public:
    vector<long long> slidingWindowMedian(vector<int> nums, int k) {
        int n = nums.size();
        vector<long long> out;
        for (int i = 0; i <= n - k; i++) {
            vector<long long> window;
            for (int j = 0; j < k; j++) {
                window.push_back(nums[i + j]);
            }
            sort(window.begin(), window.end());
            if (k % 2 == 1) {
                out.push_back(2LL * window[k / 2]);
            } else {
                out.push_back(window[k / 2 - 1] + window[k / 2]);
            }
        }
        return out;
    }
};
