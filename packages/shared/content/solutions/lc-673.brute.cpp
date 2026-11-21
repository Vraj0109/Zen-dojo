#include <vector>

using namespace std;

class Solution {
    int maxLen = 0;
    int count = 0;

    void dfs(const vector<int>& nums, int idx, int lastVal, int curLen) {
        if (idx == (int)nums.size()) {
            if (curLen > maxLen) {
                maxLen = curLen;
                count = 1;
            } else if (curLen == maxLen && curLen > 0) {
                count++;
            }
            return;
        }
        // Option 1: skip nums[idx]
        dfs(nums, idx + 1, lastVal, curLen);

        // Option 2: pick nums[idx] if strictly increasing
        if (curLen == 0 || nums[idx] > lastVal) {
            dfs(nums, idx + 1, nums[idx], curLen + 1);
        }
    }
public:
    int findNumberOfLIS(vector<int>& nums) {
        if (nums.empty()) return 0;
        maxLen = 0;
        count = 0;
        dfs(nums, 0, 0, 0);
        return count;
    }
};
