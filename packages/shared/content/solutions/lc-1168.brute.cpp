#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int minCostToSupplyWater(int n, vector<int>& wells, vector<vector<int>>& pipes) {
        vector<vector<pair<int, int>>> adj(n + 1);
        for (int i = 1; i <= n; i++) {
            adj[0].push_back({i, wells[i - 1]});
            adj[i].push_back({0, wells[i - 1]});
        }
        for (const auto& p : pipes) {
            adj[p[0]].push_back({p[1], p[2]});
            adj[p[1]].push_back({p[0], p[2]});
        }

        vector<bool> visited(n + 1, false);
        vector<int> minEdge(n + 1, 1e9);
        minEdge[0] = 0;
        int totalCost = 0;

        for (int step = 0; step <= n; step++) {
            int u = -1;
            for (int i = 0; i <= n; i++) {
                if (!visited[i] && (u == -1 || minEdge[i] < minEdge[u])) {
                    u = i;
                }
            }
            visited[u] = true;
            totalCost += minEdge[u];

            for (const auto& edge : adj[u]) {
                int v = edge.first, w = edge.second;
                if (!visited[v] && w < minEdge[v]) {
                    minEdge[v] = w;
                }
            }
        }
        return totalCost;
    }
};
