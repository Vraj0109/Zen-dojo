#include <vector>
#include <unordered_set>
#include <queue>

using namespace std;

class Solution {
public:
    vector<int> distinctColors(vector<int>& colors, vector<vector<int>>& edges) {
        int n = colors.size();
        vector<vector<int>> adj(n + 1);
        for (const auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        vector<vector<int>> children(n + 1);
        vector<int> par(n + 1, 0);
        vector<int> order;
        order.push_back(1);
        for (size_t h = 0; h < order.size(); h++) {
            int u = order[h];
            for (int v : adj[u]) {
                if (v == par[u]) continue;
                par[v] = u;
                children[u].push_back(v);
                order.push_back(v);
            }
        }
        vector<int> ans(n, 0);
        for (int i = 1; i <= n; i++) {
            unordered_set<int> col;
            queue<int> qu;
            qu.push(i);
            while (!qu.empty()) {
                int u = qu.front();
                qu.pop();
                col.insert(colors[u - 1]);
                for (int v : children[u]) {
                    qu.push(v);
                }
            }
            ans[i - 1] = (int)col.size();
        }
        return ans;
    }
};
