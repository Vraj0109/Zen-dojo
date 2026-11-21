#include <vector>
#include <queue>

using namespace std;

class Solution {
public:
    vector<int> countingPaths(int n, vector<vector<int>>& edges, vector<vector<int>>& paths) {
        vector<vector<int>> adj(n + 1);
        for (const auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        vector<int> count(n, 0);
        for (const auto& p : paths) {
            int a = p[0], b = p[1];
            vector<int> prev(n + 1, 0);
            queue<int> q;
            vector<bool> vis(n + 1, false);
            vis[a] = true;
            q.push(a);
            while (!q.empty()) {
                int u = q.front();
                q.pop();
                if (u == b) break;
                for (int v : adj[u]) {
                    if (!vis[v]) {
                        vis[v] = true;
                        prev[v] = u;
                        q.push(v);
                    }
                }
            }
            int cur = b;
            while (cur != 0) {
                count[cur - 1]++;
                if (cur == a) break;
                cur = prev[cur];
            }
        }
        return count;
    }
};
