#include <vector>

using namespace std;

class Solution {
public:
    int treeMatching(int n, vector<vector<int>>& edges) {
        vector<vector<int>> adj(n + 1);
        for (const auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        vector<int> par(n + 1, 0), order;
        order.push_back(1);
        for (size_t h = 0; h < order.size(); h++) {
            int u = order[h];
            for (int v : adj[u]) {
                if (v == par[u]) continue;
                par[v] = u;
                order.push_back(v);
            }
        }
        vector<char> used(n + 1, 0);
        int ans = 0;
        for (int i = (int)order.size() - 1; i >= 1; i--) {
            int v = order[i];
            int p = par[v];
            if (!used[v] && p != 0 && !used[p]) {
                used[v] = used[p] = 1;
                ans++;
            }
        }
        return ans;
    }
};
