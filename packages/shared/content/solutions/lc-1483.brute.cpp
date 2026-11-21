#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> kthAncestor(int n, vector<int>& parent, vector<vector<int>>& queries) {
        vector<int> res;
        res.reserve(queries.size());
        for (const auto& q : queries) {
            int node = q[0], k = q[1];
            while (k > 0 && node != -1) {
                node = parent[node];
                k--;
            }
            res.push_back(node);
        }
        return res;
    }
};
