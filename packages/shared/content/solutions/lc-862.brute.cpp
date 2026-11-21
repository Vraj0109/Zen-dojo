#include <vector>
#include <algorithm>

using namespace std;

class Solution {
public:
    int shortestSubarray(vector<int>& nums, int k) {
        int n = nums.size();
        int best = n + 1;
        for (int i = 0; i < n; i++) {
            long long sum = 0;
            for (int j = i; j < n; j++) {
                sum += nums[j];
                if (sum >= k) {
                    best = min(best, j - i + 1);
                    break; // can continue or break; shorter from same i won't be found by increasing j if we just check
                }
            }
        }
        return best <= n ? best : -1;
    }
};
