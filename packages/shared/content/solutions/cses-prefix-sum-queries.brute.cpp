#include <vector>
#include <algorithm>

using namespace std;

class Solution {
public:
    vector<long long> prefixSumQueries(vector<int>& arr, vector<vector<int>>& queries) {
        vector<int> a = arr;
        vector<long long> ans;
        for (const auto& q : queries) {
            if (q[0] == 1) {
                int k = q[1] - 1;
                int u = q[2];
                a[k] = u;
            } else {
                int l = q[1] - 1;
                int r = q[2] - 1;
                long long cur = 0, maxPref = 0;
                for (int i = l; i <= r; i++) {
                    cur += a[i];
                    if (cur > maxPref) maxPref = cur;
                }
                ans.push_back(maxPref);
            }
        }
        return ans;
    }
};
