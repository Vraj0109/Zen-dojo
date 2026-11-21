#include <vector>
#include <queue>
#include <algorithm>

using namespace std;

class Solution {
public:
    vector<int> pathQueriesII(vector<int>& values, vector<vector<int>>& edges, vector<vector<int>>& queries) {
        int n = values.size();
        vector<vector<int>> adj(n + 1);
        for (const auto& e : edges) {
            adj[e[0]].push_back(e[1]);
            adj[e[1]].push_back(e[0]);
        }
        vector<int> val(n + 1);
        for (int i = 0; i < n; i++) val[i + 1] = values[i];
        vector<int> ans;
        for (const auto& q : queries) {
            if (q[0] == 1) {
                int s = q[1];
                int x = q[2];
                val[s] = x;
            } else {
                int a = q[1], b = q[2];
                vector<int> prev(n + 1, 0);
                vector<bool> vis(n + 1, false);
                queue<int> qu;
                vis[a] = true;
                qu.push(a);
                while (!qu.empty()) {
                    int u = qu.front();
                    qu.pop();
                    if (u == b) break;
                    for (int v : adj[u]) {
                        if (!vis[v]) {
                            vis[v] = true;
                            prev[v] = u;
                            qu.push(v);
                        }
                    }
                }
                int cur = b;
                int maxVal = val[b];
                while (cur != a) {
                    cur = prev[cur];
                    if (val[cur] > maxVal) maxVal = val[cur];
                }
                ans.push_back(maxVal);
            }
        }
        return ans;
    }
};
