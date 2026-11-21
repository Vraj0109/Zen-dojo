#include <vector>
#include <queue>
#include <algorithm>

using namespace std;

class Solution {
public:
    int findingACentroid(int n, vector<vector<int>>& edges) {
        vector<vector<int>> adj(n + 1);
        for (const auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        for (int v = 1; v <= n; v++) {
            vector<bool> vis(n + 1, false);
            vis[v] = true;
            bool ok = true;
            for (int start : adj[v]) {
                if (vis[start]) continue;
                int compSize = 0;
                queue<int> q;
                vis[start] = true;
                q.push(start);
                while (!q.empty()) {
                    int u = q.front();
                    q.pop();
                    compSize++;
                    for (int nxt : adj[u]) {
                        if (!vis[nxt]) {
                            vis[nxt] = true;
                            q.push(nxt);
                        }
                    }
                }
                if (compSize > n / 2) {
                    ok = false;
                    break;
                }
            }
            if (ok) return v;
        }
        return -1;
    }
};
