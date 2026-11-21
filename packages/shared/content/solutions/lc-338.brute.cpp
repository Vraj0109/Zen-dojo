#include <vector>

using namespace std;

class Solution {
public:
    vector<int> countBits(int n) {
        vector<int> ans(n + 1, 0);
        for (int i = 0; i <= n; i++) {
            int x = i, cnt = 0;
            while (x > 0) {
                cnt += (x & 1);
                x >>= 1;
            }
            ans[i] = cnt;
        }
        return ans;
    }
};
