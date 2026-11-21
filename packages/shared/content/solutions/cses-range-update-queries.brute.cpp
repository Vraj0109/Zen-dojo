#include <vector>

using namespace std;

class Solution {
public:
    vector<long long> rangeUpdateQueries(vector<int>& arr, vector<vector<int>>& queries) {
        vector<long long> a(arr.begin(), arr.end());
        vector<long long> ans;
        for (const auto& q : queries) {
            if (q[0] == 1) {
                int l = q[1] - 1;
                int r = q[2] - 1;
                long long u = q[3];
                for (int i = l; i <= r; i++) {
                    a[i] += u;
                }
            } else {
                int k = q[1] - 1;
                ans.push_back(a[k]);
            }
        }
        return ans;
    }
};
