#include <vector>
#include <algorithm>

using namespace std;

class Solution {
public:
    vector<int> dynamicRangeMinimumQueries(vector<int>& arr, vector<vector<int>>& queries) {
        vector<int> a = arr;
        vector<int> ans;
        for (const auto& q : queries) {
            if (q[0] == 1) {
                int k = q[1] - 1;
                int u = q[2];
                a[k] = u;
            } else {
                int l = q[1] - 1;
                int r = q[2] - 1;
                int minVal = a[l];
                for (int i = l + 1; i <= r; i++) {
                    if (a[i] < minVal) minVal = a[i];
                }
                ans.push_back(minVal);
            }
        }
        return ans;
    }
};
