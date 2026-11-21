#include <vector>

using namespace std;

class Solution {
public:
    vector<int> sortColors(vector<int>& nums) {
        int cnt[3] = {0, 0, 0};
        for (int x : nums) cnt[x]++;
        int idx = 0;
        for (int v = 0; v < 3; v++) {
            while (cnt[v] > 0) {
                nums[idx++] = v;
                cnt[v]--;
            }
        }
        return nums;
    }
};
