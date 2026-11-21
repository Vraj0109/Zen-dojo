#include <vector>
#include <queue>
#include <cmath>
#include <algorithm>

using namespace std;

class Solution {
public:
    vector<vector<int>> updateMatrix(vector<vector<int>>& mat) {
        int r = mat.size(), c = mat[0].size();
        vector<pair<int, int>> zeros;
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                if (mat[i][j] == 0) zeros.push_back({i, j});
            }
        }
        vector<vector<int>> res(r, vector<int>(c, 0));
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                if (mat[i][j] == 1) {
                    int minDist = 1e9;
                    for (const auto& z : zeros) {
                        minDist = min(minDist, abs(i - z.first) + abs(j - z.second));
                    }
                    res[i][j] = minDist;
                }
            }
        }
        return res;
    }
};
