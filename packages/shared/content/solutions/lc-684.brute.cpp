#include <vector>

using namespace std;

class Solution {
    bool dfs(int src, int target, const vector<vector<int>>& adj, vector<bool>& visited) {
        if (src == target) return true;
        visited[src] = true;
        for (int next : adj[src]) {
            if (!visited[next]) {
                if (dfs(next, target, adj, visited)) return true;
            }
        }
        return false;
    }
public:
    vector<int> findRedundantConnection(vector<vector<int>>& edges) {
        int n = edges.size();
        vector<vector<int>> adj(n + 1);
        for (const auto& e : edges) {
            int u = e[0], v = e[1];
            vector<bool> visited(n + 1, false);
            if (dfs(u, v, adj, visited)) {
                return e;
            }
            adj[u].push_back(v);
            adj[v].push_back(u);
        }
        return {};
    }
};
