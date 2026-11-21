#include <bits/stdc++.h>
using namespace std;

class Solution {
    long long best = LLONG_MAX;

    void dfs(const vector<int>& nums, int idx, long long currentSum, int goal) {
        if (idx == nums.size()) {
            best = min(best, llabs(currentSum - goal));
            return;
        }
        // Exclude nums[idx]
        dfs(nums, idx + 1, currentSum, goal);
        // Include nums[idx]
        dfs(nums, idx + 1, currentSum + nums[idx], goal);
    }

public:
    int minAbsDifference(vector<int>& nums, int goal) {
        best = llabs(goal);
        dfs(nums, 0, 0, goal);
        return (int)best;
    }
};
