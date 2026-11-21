#include <bits/stdc++.h>
using namespace std;

class Solution {
    int total_n;
    long long total_sum = 0;
    long long ans = LLONG_MAX;

    void dfs(const vector<int>& nums, int idx, int count, long long current_sum) {
        if (count == total_n) {
            ans = min(ans, llabs(total_sum - 2 * current_sum));
            return;
        }
        if (idx == nums.size()) return;
        if (count + (int)nums.size() - idx < total_n) return;

        // Choose nums[idx]
        dfs(nums, idx + 1, count + 1, current_sum + nums[idx]);
        // Do not choose nums[idx]
        dfs(nums, idx + 1, count, current_sum);
    }

public:
    int minimumDifference(vector<int>& nums) {
        total_n = nums.size() / 2;
        total_sum = accumulate(nums.begin(), nums.end(), 0LL);
        ans = LLONG_MAX;
        dfs(nums, 0, 0, 0);
        return (int)ans;
    }
};
