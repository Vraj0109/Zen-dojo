#include <vector>
#include <algorithm>
#include <cmath>

using namespace std;

class Solution {
public:
    vector<int> pizzeriaQueries(vector<int>& prices, vector<vector<int>>& queries) {
        vector<int> p = prices;
        int n = p.size();
        vector<int> ans;
        for (const auto& q : queries) {
            if (q[0] == 1) {
                int k = q[1] - 1;
                int x = q[2];
                p[k] = x;
            } else {
                int k = q[1] - 1;
                int best = p[k];
                for (int i = 0; i < n; i++) {
                    int cost = p[i] + abs(i - k);
                    if (cost < best) best = cost;
                }
                ans.push_back(best);
            }
        }
        return ans;
    }
};
