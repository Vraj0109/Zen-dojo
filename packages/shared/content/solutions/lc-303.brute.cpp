#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> rangeSumQuery(vector<int>& nums, vector<vector<int>>& queries) {
        vector<int> res;
        res.reserve(queries.size());
        for (const auto& q : queries) {
            int l = q[0], r = q[1];
            long long sum = 0;
            for (int i = l; i <= r; i++) {
                sum += nums[i];
            }
            res.push_back((int)sum);
        }
        return res;
    }
};
