#include <vector>
#include <unordered_set>

using namespace std;

class Solution {
public:
    vector<int> companyQueriesII(int n, vector<int>& bosses, vector<vector<int>>& queries) {
        vector<int> par(n + 1, 0);
        for (int i = 0; i < n - 1; i++) {
            par[i + 2] = bosses[i];
        }
        vector<int> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            int a = q[0], b = q[1];
            vector<bool> vis(n + 1, false);
            int cur = a;
            while (cur != 0) {
                vis[cur] = true;
                cur = par[cur];
            }
            cur = b;
            while (cur != 0 && !vis[cur]) {
                cur = par[cur];
            }
            ans.push_back(cur);
        }
        return ans;
    }
};
