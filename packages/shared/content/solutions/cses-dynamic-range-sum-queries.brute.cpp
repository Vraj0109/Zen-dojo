#include <vector>

using namespace std;

class Solution {
public:
    vector<long long> dynamicRangeSumQueries(vector<int>& arr, vector<vector<int>>& queries) {
        vector<long long> a(arr.begin(), arr.end());
        vector<long long> ans;
        for (const auto& q : queries) {
            if (q[0] == 1) {
                int k = q[1] - 1;
                long long u = q[2];
                a[k] = u;
            } else if (q[0] == 2) {
                int l = q[1] - 1;
                int r = q[2] - 1;
                long long sum = 0;
                for (int i = l; i <= r; i++) {
                    sum += a[i];
                }
                ans.push_back(sum);
            }
        }
        return ans;
    }
};
