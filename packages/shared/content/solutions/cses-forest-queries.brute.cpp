#include <vector>
#include <string>

using namespace std;

class Solution {
public:
    vector<int> forestQueries(vector<string>& forest, vector<vector<int>>& queries) {
        vector<int> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            int y1 = q[0] - 1, x1 = q[1] - 1;
            int y2 = q[2] - 1, x2 = q[3] - 1;
            int count = 0;
            for (int r = y1; r <= y2; r++) {
                for (int c = x1; c <= x2; c++) {
                    if (forest[r][c] == '*') count++;
                }
            }
            ans.push_back(count);
        }
        return ans;
    }
};
