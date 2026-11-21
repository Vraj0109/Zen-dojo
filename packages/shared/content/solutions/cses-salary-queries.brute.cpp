#include <vector>

using namespace std;

class Solution {
public:
    vector<int> salaryQueries(vector<int>& salaries, vector<vector<int>>& queries) {
        vector<int> cur = salaries;
        vector<int> ans;
        for (const auto& q : queries) {
            if (q[0] == 1) {
                int k = q[1] - 1;
                int x = q[2];
                cur[k] = x;
            } else {
                int a = q[1];
                int b = q[2];
                int count = 0;
                for (int s : cur) {
                    if (s >= a && s <= b) count++;
                }
                ans.push_back(count);
            }
        }
        return ans;
    }
};
