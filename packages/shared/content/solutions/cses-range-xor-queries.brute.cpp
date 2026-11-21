#include <vector>

using namespace std;

class Solution {
public:
    vector<int> rangeXorQueries(vector<int>& arr, vector<vector<int>>& queries) {
        vector<int> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            int a = q[0] - 1;
            int b = q[1] - 1;
            int x = 0;
            for (int i = a; i <= b; i++) {
                x ^= arr[i];
            }
            ans.push_back(x);
        }
        return ans;
    }
};
