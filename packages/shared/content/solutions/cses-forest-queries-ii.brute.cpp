#include <vector>
#include <string>

using namespace std;

class Solution {
public:
    vector<int> forestQueriesII(vector<string>& forest, vector<vector<int>>& queries) {
        vector<string> g = forest;
        vector<int> ans;
        for (const auto& q : queries) {
            if (q[0] == 1) {
                int y = q[1] - 1, x = q[2] - 1;
                g[y][x] = (g[y][x] == '*') ? '.' : '*';
            } else {
                int y1 = q[1] - 1, x1 = q[2] - 1;
                int y2 = q[3] - 1, x2 = q[4] - 1;
                int count = 0;
                for (int r = y1; r <= y2; r++) {
                    for (int c = x1; c <= x2; c++) {
                        if (g[r][c] == '*') count++;
                    }
                }
                ans.push_back(count);
            }
        }
        return ans;
    }
};
