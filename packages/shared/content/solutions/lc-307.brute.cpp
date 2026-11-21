#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    vector<int> rangeSumMutable(vector<int>& nums, vector<vector<int>>& queries) {
        vector<int> a = nums;
        vector<int> res;
        for (const auto& q : queries) {
            int type = q[0];
            if (type == 1) {
                int idx = q[1], val = q[2];
                a[idx] = val;
            } else {
                int l = q[1], r = q[2];
                long long sum = 0;
                for (int i = l; i <= r; i++) {
                    sum += a[i];
                }
                res.push_back((int)sum);
            }
        }
        return res;
    }
};
