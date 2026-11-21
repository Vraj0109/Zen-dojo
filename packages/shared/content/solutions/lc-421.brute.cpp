#include <vector>
#include <algorithm>

using namespace std;

class Solution {
public:
    int findMaximumXOR(vector<int>& nums) {
        int maxVal = 0;
        int n = nums.size();
        for (int i = 0; i < n; i++) {
            for (int j = i; j < n; j++) {
                maxVal = max(maxVal, nums[i] ^ nums[j]);
            }
        }
        return maxVal;
    }
};
