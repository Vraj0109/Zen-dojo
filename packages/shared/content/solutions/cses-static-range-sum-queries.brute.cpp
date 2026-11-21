#include <vector>

using namespace std;

class Solution {
public:
    vector<long long> staticRangeSumQueries(vector<int>& arr, vector<vector<int>>& queries) {
        vector<long long> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            int a = q[0] - 1;
            int b = q[1] - 1;
            long long sum = 0;
            for (int i = a; i <= b; i++) {
                sum += arr[i];
            }
            ans.push_back(sum);
        }
        return ans;
    }
};
