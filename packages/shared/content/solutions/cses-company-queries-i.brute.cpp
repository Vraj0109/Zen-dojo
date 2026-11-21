#include <vector>

using namespace std;

class Solution {
public:
    vector<int> companyQueriesI(int n, vector<int>& bosses, vector<vector<int>>& queries) {
        vector<int> par(n + 1, 0);
        for (int i = 0; i < n - 1; i++) {
            par[i + 2] = bosses[i];
        }
        vector<int> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            int x = q[0];
            int k = q[1];
            int cur = x;
            while (k > 0 && cur != 0) {
                cur = par[cur];
                k--;
            }
            ans.push_back(cur == 0 ? -1 : cur);
        }
        return ans;
    }
};
