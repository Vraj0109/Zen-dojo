#include <vector>

using namespace std;

class Solution {
public:
    vector<long long> pathQueries(vector<int>& values, vector<vector<int>>& edges, vector<vector<int>>& queries) {
        int n = values.size();
        vector<vector<int>> adj(n + 1);
        for (const auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        vector<int> par(n + 1, 0);
        vector<int> order;
        order.push_back(1);
        for (size_t h = 0; h < order.size(); h++) {
            int u = order[h];
            for (int v : adj[u]) {
                if (v == par[u]) continue;
                par[v] = u;
                order.push_back(v);
            }
        }
        vector<long long> val(n + 1);
        for (int i = 0; i < n; i++) val[i + 1] = values[i];
        vector<long long> ans;
        for (const auto& q : queries) {
            if (q[0] == 1) {
                int s = q[1];
                long long x = q[2];
                val[s] = x;
            } else {
                int s = q[1];
                long long sum = 0;
                int cur = s;
                while (cur != 0) {
                    sum += val[cur];
                    cur = par[cur];
                }
                ans.push_back(sum);
            }
        }
        return ans;
    }
};
