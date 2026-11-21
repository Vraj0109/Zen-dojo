#include <vector>

using namespace std;

class Solution {
public:
    vector<int> subordinates(int n, vector<int>& bosses) {
        vector<vector<int>> adj(n + 1);
        for (int i = 0; i < n - 1; i++) {
            int emp = i + 2;
            int boss = bosses[i];
            adj[boss].push_back(emp);
        }
        vector<int> ans(n, 0);
        for (int i = 1; i <= n; i++) {
            int count = 0;
            vector<int> q = {i};
            int head = 0;
            while (head < (int)q.size()) {
                int u = q[head++];
                for (int v : adj[u]) {
                    count++;
                    q.push_back(v);
                }
            }
            ans[i - 1] = count;
        }
        return ans;
    }
};
