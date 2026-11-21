#include <vector>
#include <queue>
#include <algorithm>

using namespace std;

class Solution {
public:
    int treeDiameter(int n, vector<vector<int>>& edges) {
        if (n <= 1) return 0;
        vector<vector<int>> adj(n + 1);
        for (const auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        int maxDist = 0;
        for (int i = 1; i <= n; i++) {
            vector<int> dist(n + 1, -1);
            queue<int> q;
            dist[i] = 0;
            q.push(i);
            while (!q.empty()) {
                int u = q.front();
                q.pop();
                if (dist[u] > maxDist) maxDist = dist[u];
                for (int v : adj[u]) {
                    if (dist[v] == -1) {
                        dist[v] = dist[u] + 1;
                        q.push(v);
                    }
                }
            }
        }
        return maxDist;
    }
};
