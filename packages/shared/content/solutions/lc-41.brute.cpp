#include <vector>
#include <unordered_set>

class Solution {
public:
    int firstMissingPositive(std::vector<int>& nums) {
        std::unordered_set<int> seen(nums.begin(), nums.end());
        int ans = 1;
        while (seen.count(ans)) {
            ans++;
        }
        return ans;
    }
};
