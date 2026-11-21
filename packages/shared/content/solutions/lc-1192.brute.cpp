#include <vector>

using namespace std;

class Solution {
    void dfs(int u, int skipped_edge, const vector<vector<pair<int, int>>>& g, vector<bool>& visited) {
        visited[u] = true;
        for (const auto& edge : g[u]) {
            int v = edge.first;
            int edge_id = edge.second;
            if (edge_id == skipped_edge) continue;
            if (!visited[v]) {
                dfs(v, skipped_edge, g, visited);
            }
        }
    }

public:
    vector<vector<int>> criticalConnections(int n, vector<vector<int>>& connections) {
        int m = (int)connections.size();
        vector<vector<pair<int, int>>> g(n);
        for (int i = 0; i < m; ++i) {
            int u = connections[i][0];
            int v = connections[i][1];
            g[u].push_back({v, i});
            g[v].push_back({u, i});
        }

        vector<vector<int>> bridges;
        for (int i = 0; i < m; ++i) {
            vector<bool> visited(n, false);
            dfs(0, i, g, visited);
            bool connected = true;
            for (int j = 0; j < n; ++j) {
                if (!visited[j]) {
                    connected = false;
                    break;
                }
            }
            if (!connected) {
                bridges.push_back(connections[i]);
            }
        }
        return bridges;
    }
};
