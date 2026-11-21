#include <vector>
#include <numeric>
#include <algorithm>

using namespace std;

class Solution {
    bool backtrack(const vector<int>& nums, int idx, vector<int>& buckets, int target) {
        if (idx == (int)nums.size()) {
            return true;
        }
        for (int i = 0; i < (int)buckets.size(); ++i) {
            if (buckets[i] + nums[idx] <= target) {
                buckets[i] += nums[idx];
                if (backtrack(nums, idx + 1, buckets, target)) {
                    return true;
                }
                buckets[i] -= nums[idx];
            }
            if (buckets[i] == 0) break;
        }
        return false;
    }

public:
    bool canPartitionKSubsets(vector<int>& nums, int k) {
        int total = accumulate(nums.begin(), nums.end(), 0);
        if (total % k != 0) return false;
        int target = total / k;
        sort(nums.rbegin(), nums.rend());
        if (nums[0] > target) return false;

        vector<int> buckets(k, 0);
        return backtrack(nums, 0, buckets, target);
    }
};
