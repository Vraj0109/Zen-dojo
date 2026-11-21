#include <vector>
#include <algorithm>

using namespace std;

class Solution {
public:
    vector<long long> subarraySumQueries(vector<int>& arr, vector<vector<int>>& queries) {
        vector<int> a = arr;
        int n = a.size();
        vector<long long> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            int k = q[0] - 1;
            int x = q[1];
            a[k] = x;
            long long maxSoFar = 0, cur = 0;
            for (int i = 0; i < n; i++) {
                cur += a[i];
                if (cur < 0) cur = 0;
                if (cur > maxSoFar) maxSoFar = cur;
            }
            ans.push_back(maxSoFar);
        }
        return ans;
    }
};
