#include <vector>
#include <algorithm>

using namespace std;

class Solution {
public:
    vector<int> staticRangeMinimumQueries(vector<int>& arr, vector<vector<int>>& queries) {
        vector<int> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            int a = q[0] - 1;
            int b = q[1] - 1;
            int minVal = arr[a];
            for (int i = a + 1; i <= b; i++) {
                if (arr[i] < minVal) minVal = arr[i];
            }
            ans.push_back(minVal);
        }
        return ans;
    }
};
