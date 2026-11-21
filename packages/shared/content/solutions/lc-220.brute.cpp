#include <vector>
#include <cmath>
#include <cstdlib>

using namespace std;

class Solution {
public:
    bool containsNearbyAlmostDuplicate(vector<int>& nums, int indexDiff, int valueDiff) {
        int n = (int)nums.size();
        for (int i = 0; i < n; ++i) {
            for (int j = i + 1; j <= min(n - 1, i + indexDiff); ++j) {
                if (abs((long long)nums[i] - nums[j]) <= valueDiff) {
                    return true;
                }
            }
        }
        return false;
    }
};
