#include <bits/stdc++.h>
using namespace std;

class Solution {
public:
    int maximalRectangle(vector<vector<string>>& matrix) {
        if (matrix.empty() || matrix[0].empty()) return 0;
        int m = matrix.size(), n = matrix[0].size();
        int maxArea = 0;

        for (int r1 = 0; r1 < m; r1++) {
            for (int c1 = 0; c1 < n; c1++) {
                if (matrix[r1][c1] != "1") continue;
                for (int r2 = r1; r2 < m; r2++) {
                    for (int c2 = c1; c2 < n; c2++) {
                        bool allOnes = true;
                        for (int r = r1; r <= r2 && allOnes; r++) {
                            for (int c = c1; c <= c2; c++) {
                                if (matrix[r][c] != "1") {
                                    allOnes = false;
                                    break;
                                }
                            }
                        }
                        if (allOnes) {
                            maxArea = max(maxArea, (r2 - r1 + 1) * (c2 - c1 + 1));
                        }
                    }
                }
            }
        }
        return maxArea;
    }
};
