#include <vector>
#include <unordered_set>

using namespace std;

class Solution {
public:
    vector<int> distinctValuesQueries(vector<int>& arr, vector<vector<int>>& queries) {
        vector<int> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            int a = q[0] - 1;
            int b = q[1] - 1;
            unordered_set<int> s;
            for (int i = a; i <= b; i++) {
                s.insert(arr[i]);
            }
            ans.push_back((int)s.size());
        }
        return ans;
    }
};
