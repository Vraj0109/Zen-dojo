#include <vector>
#include <queue>

using namespace std;

class Solution {
public:
    vector<long long> treeDistancesII(int n, vector<vector<int>>& edges) {
        if (n == 1) return {0};
        vector<vector<int>> adj(n + 1);
        for (const auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        vector<long long> ans(n, 0);
        for (int i = 1; i <= n; i++) {
            vector<int> dist(n + 1, -1);
            queue<int> q;
            dist[i] = 0;
            q.push(i);
            long long sumD = 0;
            while (!q.empty()) {
                int u = q.front();
                q.pop();
                sumD += dist[u];
                for (int v : adj[u]) {
                    if (dist[v] == -1) {
                        dist[v] = dist[u] + 1;
                        q.push(v);
                    }
                }
            }
            ans[i - 1] = sumD;
        }
        return ans;
    }
};
