#include <vector>
#include <algorithm>
#include <set>

using namespace std;

class Solution {
public:
    vector<vector<int>> subsetsWithDup(vector<int>& nums) {
        sort(nums.begin(), nums.end());
        int n = (int)nums.size();
        set<vector<int>> unique_subsets;

        for (int mask = 0; mask < (1 << n); ++mask) {
            vector<int> sub;
            for (int i = 0; i < n; ++i) {
                if (mask & (1 << i)) {
                    sub.push_back(nums[i]);
                }
            }
            unique_subsets.insert(sub);
        }

        return vector<vector<int>>(unique_subsets.begin(), unique_subsets.end());
    }
};
